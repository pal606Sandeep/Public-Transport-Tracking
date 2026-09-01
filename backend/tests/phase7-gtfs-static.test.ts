import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { zlib } from "zlib";
import { Types } from "mongoose";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";
import { Route } from "../src/modules/route/route.model.js";
import { Stop } from "../src/modules/stop/stop.model.js";
import { Schedule } from "../src/modules/schedule/schedule.model.js";
import { listZipEntries, sha1Hex } from "../src/utils/zip.js";
import { buildStaticGtfs } from "../src/modules/gtfs/gtfs-static.controller.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;

const stop1Id = new Types.ObjectId();
const stop2Id = new Types.ObjectId();
const stop3Id = new Types.ObjectId();
const routeId = new Types.ObjectId();
const scheduleId = new Types.ObjectId();

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  await Stop.create([
    { _id: stop1Id, name: "Alpha", code: "A1", location: { type: "Point", coordinates: [73.85, 18.5] } },
    { _id: stop2Id, name: "Bravo", code: "B2", location: { type: "Point", coordinates: [73.86, 18.51] } },
    { _id: stop3Id, name: "Charlie", code: "C3", location: { type: "Point", coordinates: [73.87, 18.52] } },
  ]);
  await Route.create({
    _id: routeId,
    routeNumber: "GTFS-1",
    name: "Test Route",
    distanceKm: 10,
    estimatedDurationMin: 30,
    geometry: { type: "LineString", coordinates: [[73.85, 18.5], [73.86, 18.51], [73.87, 18.52]] },
    orderedStops: [
      { stopId: stop1Id, sequence: 1, scheduledOffsetMinutes: 0 },
      { stopId: stop2Id, sequence: 2, scheduledOffsetMinutes: 10 },
      { stopId: stop3Id, sequence: 3, scheduledOffsetMinutes: 20 },
    ],
  });
  await Schedule.create({
    _id: scheduleId,
    name: "Test Schedule",
    route: routeId,
    frequencyType: "DAILY",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    departureTimes: ["08:00", "10:00"],
    durationMin: 30,
  });
});

afterAll(async () => {
  await shutdown();
});

describe("P1-55 — GTFS Static Export", () => {
  it("GET /api/v1/gtfs/static.zip returns a valid ZIP", async () => {
    const res = await req.get("/api/v1/gtfs/static.zip").responseType("blob").expect(200);
    expect(res.headers["content-type"]).toMatch(/application\/zip/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    expect(res.headers["etag"]).toBeTruthy();
    const buf = Buffer.isBuffer(res.body)
      ? (res.body as Buffer)
      : Buffer.from(res.body as ArrayBuffer);
    const entries = listZipEntries(buf);
    expect(entries).toEqual(
      expect.arrayContaining([
        "agency.txt",
        "stops.txt",
        "routes.txt",
        "calendar.txt",
        "calendar_dates.txt",
        "trips.txt",
        "stop_times.txt",
        "fare_attributes.txt",
        "fare_rules.txt",
      ])
    );
    expect(entries.length).toBe(9);
  });

  it("matching If-None-Match → 304", async () => {
    const r1 = await req.get("/api/v1/gtfs/static.zip").expect(200);
    const etag = r1.headers["etag"] as string;
    await req.get("/api/v1/gtfs/static.zip").set("If-None-Match", etag).expect(304);
  });

  it("built bundle contains valid CSV rows for our seeded data", async () => {
    const { zip } = await buildStaticGtfs();
    const names = listZipEntries(zip);
    expect(names).toContain("stops.txt");
    expect(names).toContain("routes.txt");
    expect(names).toContain("calendar.txt");
    expect(names).toContain("trips.txt");
    expect(names).toContain("stop_times.txt");

    // Quick content sanity-check: decode the central directory entry for stops.txt
    const stopsEntry = extractEntry(zip, "stops.txt");
    expect(stopsEntry).toContain("stop_id");
    expect(stopsEntry).toContain("Alpha");
    expect(stopsEntry).toContain("Bravo");
    expect(stopsEntry).toContain("Charlie");
    expect(stopsEntry.split("\r\n")[0].split(",").length).toBe(7); // header columns

    const routesEntry = extractEntry(zip, "routes.txt");
    expect(routesEntry).toContain("GTFS-1");
    expect(routesEntry).toContain("Test Route");

    const calendarEntry = extractEntry(zip, "calendar.txt");
    expect(calendarEntry).toContain(scheduleId.toString());

    expect(sha1Hex(zip)).toMatch(/^[a-f0-9]{40}$/);
  });

  it("unauthenticated → 200 (public feed)", async () => {
    await req.get("/api/v1/gtfs/static.zip").expect(200);
  });

  it("passenger access works (public GTFS feed)", async () => {
    await req.get("/api/v1/gtfs/static.zip").set("Authorization", `Bearer ${passengerToken}`).expect(200);
  });
});

// Extract a single entry's data from a STORED-method archive by walking the
// central directory. Returns utf-8 text.
const extractEntry = (zip: Buffer, name: string): string => {
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) !== 0x06054b50) continue;
    const total = zip.readUInt16LE(i + 10);
    const cdOffset = zip.readUInt32LE(i + 16);
    let p = cdOffset;
    for (let n = 0; n < total; n++) {
      if (zip.readUInt32LE(p) !== 0x02014b50) break;
      const nameLen = zip.readUInt16LE(p + 28);
      const extraLen = zip.readUInt16LE(p + 30);
      const commentLen = zip.readUInt16LE(p + 32);
      const localOffset = zip.readUInt32LE(p + 42);
      const entryName = zip.slice(p + 46, p + 46 + nameLen).toString("utf8");
      if (entryName === name) {
        // local file header
        const lNameLen = zip.readUInt16LE(localOffset + 26);
        const lExtraLen = zip.readUInt16LE(localOffset + 28);
        const compSize = zip.readUInt32LE(localOffset + 18);
        const start = localOffset + 30 + lNameLen + lExtraLen;
        return zip.slice(start, start + compSize).toString("utf8");
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    return "";
  }
  return "";
};