import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let userToken: string;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  userToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
});

afterAll(async () => {
  await shutdown();
});

describe("P1-31 — Reference-Data Sync", () => {
  it("GET /sync/routes returns docs with a checksum + count", async () => {
    await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ routeNumber: "SYNC-A", name: "Sync Route A" })
      .expect(201);

    const res = await req.get("/api/v1/sync/routes").set("Authorization", `Bearer ${userToken}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checksum).toBeTruthy();
    expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    expect(res.headers.etag).toBeTruthy();
  });

  it("updatedSince returns only docs changed after the timestamp", async () => {
    const res = await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ routeNumber: "SYNC-B", name: "Sync Route B" })
      .expect(201);
    expect(res.status).toBe(201);

    await sleep(15);
    const ts = new Date().toISOString();

    await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ routeNumber: "SYNC-C", name: "Sync Route C" })
      .expect(201);

    const delta = await req.get(`/api/v1/sync/routes?updatedSince=${encodeURIComponent(ts)}`).set("Authorization", `Bearer ${userToken}`).expect(200);
    expect(delta.body.data.count).toBe(1);
    expect(delta.body.data.data[0].routeNumber).toBe("SYNC-C");
    expect(delta.body.data.checksum).toBeTruthy();
  });

  it("matching If-None-Match returns 304", async () => {
    const first = await req.get("/api/v1/sync/routes").set("Authorization", `Bearer ${userToken}`).expect(200);
    const etag = first.headers.etag as string;
    expect(etag).toBeTruthy();
    const second = await req.get("/api/v1/sync/routes").set("Authorization", `Bearer ${userToken}`).set("If-None-Match", etag);
    expect(second.status).toBe(304);
  });

  it("checksum changes after a write", async () => {
    const before = await req.get("/api/v1/sync/routes").set("Authorization", `Bearer ${userToken}`).expect(200);
    const beforeChecksum = before.body.data.checksum;

    await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ routeNumber: "SYNC-D", name: "Sync Route D" })
      .expect(201);

    const after = await req.get("/api/v1/sync/routes").set("Authorization", `Bearer ${userToken}`).expect(200);
    expect(after.body.data.checksum).not.toBe(beforeChecksum);
  });

  it("stops + schedules endpoints respond with checksum", async () => {
    await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ code: "SYNC-STOP", name: "Sync Stop", location: { type: "Point", coordinates: [77.2, 12.1] } })
      .expect(201);

    const stops = await req.get("/api/v1/sync/stops").set("Authorization", `Bearer ${userToken}`).expect(200);
    expect(stops.body.data.checksum).toBeTruthy();
    expect(stops.body.data.count).toBeGreaterThanOrEqual(1);

    const sched = await req.get("/api/v1/sync/schedules").set("Authorization", `Bearer ${userToken}`).expect(200);
    expect(typeof sched.body.data.checksum).toBe("string");
  });
});
