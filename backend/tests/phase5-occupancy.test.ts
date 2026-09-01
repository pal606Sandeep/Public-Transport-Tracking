import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;

let routeId = "";
let vehicleId = "";
let tripId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const stopA = (await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Occ Stop A", code: "OCA", location: { type: "Point", coordinates: [82, 18] } })
    .expect(201)).body.data.stop._id;
  const stopC = (await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Occ Stop C", code: "OCC", location: { type: "Point", coordinates: [82.2, 18] } })
    .expect(201)).body.data.stop._id;

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "OCC-1",
      name: "Occupancy Route",
      distanceKm: 8,
      estimatedDurationMin: 20,
      orderedStops: [
        { stopId: stopA, sequence: 0 },
        { stopId: stopC, sequence: 1 },
      ],
    })
    .expect(201);
  routeId = route.body.data.route._id;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-93-OCC-2026", model: "Occ", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  const trip = await req
    .post("/api/v1/admin/trips")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      route: routeId,
      vehicle: vehicleId,
      scheduledStartAt: new Date().toISOString(),
      scheduledEndAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .expect(201);
  tripId = trip.body.data.trip._id;
});

afterAll(async () => {
  await shutdown();
});

const occEvent = (traceId: string, level: string, passengerCount: number, ts: number) => ({
  eventType: "OCCUPANCY_CHANGED",
  payload: {
    vehicleId,
    tripId,
    routeId,
    previousLevel: "LOW",
    currentLevel: level,
    passengerCount,
    capacity: 40,
    occupancyPercentage: Math.round((passengerCount / 40) * 100),
    timestamp: ts,
  },
  traceId,
  timestamp: ts,
});

describe("P1-47 — Occupancy consumption (crowding history + analytics)", () => {
  it("guest cannot read occupancy analytics → 403", async () => {
    const guest = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;
    await req
      .get("/api/v1/admin/analytics/occupancy")
      .set("Authorization", `Bearer ${guest}`)
      .expect(403);
  });

  it("passenger cannot read occupancy analytics → 403", async () => {
    await req
      .get("/api/v1/admin/analytics/occupancy")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(403);
  });

  it("stores OCCUPANCY_CHANGED readings with a crowding history", async () => {
    const { handleOccupancyEvent } = await import("../src/modules/analytics/occupancy.consumer.js");
    const base = Date.now();
    const r1 = await handleOccupancyEvent({ ...occEvent("occ-1", "LOW", 5, base), traceId: "occ-1" });
    const r2 = await handleOccupancyEvent({ ...occEvent("occ-2", "MODERATE", 22, base + 1000), traceId: "occ-2" });
    const r3 = await handleOccupancyEvent({ ...occEvent("occ-3", "CROWDED", 38, base + 2000), traceId: "occ-3" });
    expect(r1.stored).toBe("new");
    expect(r2.stored).toBe("new");
    expect(r3.stored).toBe("new");
  });

  it("dedupes a replayed event by traceId (at-least-once)", async () => {
    const { handleOccupancyEvent } = await import("../src/modules/analytics/occupancy.consumer.js");
    const s = await handleOccupancyEvent({ ...occEvent("occ-2", "MODERATE", 22, Date.now()), traceId: "occ-2" });
    expect(s.stored).toBe("duplicate");
  });

  it("returns crowding distribution via the admin analytics endpoint", async () => {
    const res = await req
      .get(`/api/v1/admin/analytics/occupancy?tripId=${tripId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const d = res.body.data;
    expect(d.total).toBe(3);
    // LOW:1, MODERATE:1, CROWDED:1
    const byLevel = Object.fromEntries(d.distribution.map((x: { level: string; count: number }) => [x.level, x.count]));
    expect(byLevel).toMatchObject({ LOW: 1, MODERATE: 1, CROWDED: 1 });
    expect(d.latest.level).toBe("CROWDED");
  });

  it("filters analytics by time window and route", async () => {
    const res = await req
      .get(`/api/v1/admin/analytics/occupancy?routeId=${routeId}&from=${Date.now() - 60_000}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.total).toBe(3); // all three readings within the window
    expect(res.body.data.filters.routeId).toBe(routeId);
  });
});
