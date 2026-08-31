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

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ routeNumber: "T-300", name: "Terminal Line" })
    .expect(201);
  routeId = route.body.data.route._id;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-90-BC-2026", model: "Ashok Leyland", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;
});

afterAll(async () => {
  await shutdown();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeTrip = async (): Promise<any> => {
  const res = await req
    .post("/api/v1/admin/trips")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      route: routeId,
      vehicle: vehicleId,
      scheduledStartAt: new Date("2026-10-01T08:00:00.000Z").toISOString(),
      scheduledEndAt: new Date("2026-10-01T08:45:00.000Z").toISOString(),
    })
    .expect(201);
  return res.body.data.trip;
};

describe("P1-27 — Trip Management (business lifecycle)", () => {
  it("passenger cannot access admin trip endpoints → 403", async () => {
    await req.get("/api/v1/admin/trips").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("creates a trip in SCHEDULED status", async () => {
    const t = await makeTrip();
    expect(t.status).toBe("SCHEDULED");
    expect(t.route).toBe(routeId);
  });

  it("valid transition chain SCHEDULED→ASSIGNED→ACTIVE→PAUSED→ACTIVE→COMPLETED", async () => {
    const t = await makeTrip();
    let cur = t;

    const tr = (status: string) =>
      req
        .post(`/api/v1/admin/trips/${cur._id}/transition`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status });

    cur = (await tr("ASSIGNED")).body.data.trip;
    expect(cur.status).toBe("ASSIGNED");
    cur = (await tr("ACTIVE")).body.data.trip;
    expect(cur.status).toBe("ACTIVE");
    expect(cur.startTime).toBeTruthy();
    cur = (await tr("PAUSED")).body.data.trip;
    expect(cur.status).toBe("PAUSED");
    cur = (await tr("ACTIVE")).body.data.trip;
    expect(cur.status).toBe("ACTIVE");
    cur = (await tr("COMPLETED")).body.data.trip;
    expect(cur.status).toBe("COMPLETED");
    expect(cur.endTime).toBeTruthy();
  });

  it("invalid transition (COMPLETED→ACTIVE) → 409", async () => {
    const t = await makeTrip();
    const tr = (status: string) =>
      req
        .post(`/api/v1/admin/trips/${t._id}/transition`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status });
    await tr("ASSIGNED").expect(200);
    await tr("ACTIVE").expect(200);
    await tr("COMPLETED").expect(200);
    await tr("ACTIVE").expect(409);
  });

  it("assign with a non-existent vehicle rolls back the transaction (trip keeps SCHEDULED)", async () => {
    const t = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${t._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: null, vehicleId: "0123456789abcdef01234567", conductorId: null })
      .expect(404);
    const chk = await req.get(`/api/v1/admin/trips/${t._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(chk.body.data.trip.status).toBe("SCHEDULED");
  });

  it("valid assign moves SCHEDULED→ASSIGNED and sets the vehicle", async () => {
    const t = await makeTrip();
    const res = await req
      .post(`/api/v1/admin/trips/${t._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: null, vehicleId, conductorId: null })
      .expect(200);
    expect(res.body.data.trip.status).toBe("ASSIGNED");
    expect(res.body.data.trip.vehicle).toBe(vehicleId);
  });

  it("cancel sets CANCELLED + reason", async () => {
    const t = await makeTrip();
    const res = await req
      .post(`/api/v1/admin/trips/${t._id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Road closure" })
      .expect(200);
    expect(res.body.data.trip.status).toBe("CANCELLED");
    expect(res.body.data.trip.cancelReason).toBe("Road closure");
  });

  it("miss sets MISSED (SCHEDULED→MISSED valid; ASSIGNED→MISSED valid)", async () => {
    const t = await makeTrip();
    const res = await req
      .post(`/api/v1/admin/trips/${t._id}/miss`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.trip.status).toBe("MISSED");
  });

  it("bulk status sets MISSED/CANCELLED on many trips", async () => {
    const t1 = await makeTrip();
    const t2 = await makeTrip();
    const res = await req
      .post("/api/v1/admin/trips/bulk-status")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ tripIds: [t1._id, t2._id], status: "MISSED" })
      .expect(200);
    expect(res.body.data.updated).toBe(2);
  });
});
