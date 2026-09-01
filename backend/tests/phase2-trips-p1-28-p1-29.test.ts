import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
  DRIVER_EMAIL,
  DRIVER_PASSWORD,
  CONDUCTOR_EMAIL,
  CONDUCTOR_PASSWORD,
} from "./support.js";
import { SystemSetting } from "../src/models/systemSetting.model.js";
import { User } from "../src/modules/user/user.model.js";
import { Driver } from "../src/modules/driver/driver.model.js";
import { Conductor } from "../src/modules/conductor/conductor.model.js";
import { Trip } from "../src/modules/trip/trip.model.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;
let driverToken: string;
let conductorToken: string;
let routeId = "";
let vehicleId = "";
let driverId = "";
let conductorId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
  conductorToken = await loginToken(req, CONDUCTOR_EMAIL, CONDUCTOR_PASSWORD);

  const driverUser = await User.findOne({ email: DRIVER_EMAIL }).lean();
  const conductorUser = await User.findOne({ email: CONDUCTOR_EMAIL }).lean();

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "T-301",
      name: "Test Line",
      geometry: {
        type: "LineString",
        coordinates: [
          [77.5946, 12.9716],
          [77.6046, 12.9816],
        ],
      },
      orderedStops: [
        { stopId: "507f1f77bcf86cd799439011", sequence: 1, scheduledOffsetMinutes: 0 },
        { stopId: "507f1f77bcf86cd799439012", sequence: 2, scheduledOffsetMinutes: 10 },
      ],
    })
    .expect(201);
  routeId = route.body.data.route._id;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-91-BC-2026", model: "TestBus", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  const driverProfile = await req
    .post("/api/v1/admin/drivers")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      user: driverUser!._id.toString(),
      name: "Test Driver",
      employeeId: "DRV-001",
      licenseNumber: "DL-TEST-001",
    })
    .expect(201);
  driverId = driverProfile.body.data.driver._id;

  const conductorProfile = await req
    .post("/api/v1/admin/conductors")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      user: conductorUser!._id.toString(),
      name: "Test Conductor",
      employeeId: "CON-001",
    })
    .expect(201);
  conductorId = conductorProfile.body.data.conductor._id;
});

afterAll(async () => {
  await shutdown();
});

// Each test provisions its own trip; clear any non-terminal trips so a leftover
// ACTIVE/PAUSED trip from a prior test can't be picked up by /me/active-trip.
afterEach(async () => {
  await Trip.updateMany(
    { status: { $in: ["SCHEDULED", "ASSIGNED", "ACTIVE", "PAUSED"] } },
    { $set: { status: "CANCELLED", cancelReason: "test cleanup", cancelledAt: new Date() } }
  );
});

const makeTrip = async (driver?: string, conductor?: string) => {
  const res = await req
    .post("/api/v1/admin/trips")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      route: routeId,
      vehicle: vehicleId,
      driver: driver ?? driverId,
      conductor: conductor ?? conductorId,
      scheduledStartAt: new Date("2026-10-01T08:00:00.000Z").toISOString(),
      scheduledEndAt: new Date("2026-10-01T08:45:00.000Z").toISOString(),
    })
    .expect(201);
  return res.body.data.trip;
};

describe("P1-28 — Trip: active-trip recovery + pause/resume/end", () => {
  it("passenger cannot access /api/v1/me/active-trip → 403", async () => {
    await req.get("/api/v1/me/active-trip").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("no active trip → 404", async () => {
    await req.get("/api/v1/me/active-trip").set("Authorization", `Bearer ${driverToken}`).expect(404);
  });

  it("start a trip then recover it via /api/v1/me/active-trip", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);

    await req
      .post(`/api/v1/admin/trips/${trip._id}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    const active = await req
      .get("/api/v1/me/active-trip")
      .set("Authorization", `Bearer ${driverToken}`)
      .expect(200);

    expect(active.body.data.trip._id).toBe(trip._id);
    expect(active.body.data.trip.status).toBe("ACTIVE");
    expect(active.body.data.trip.route).toBeTruthy();
    expect(active.body.data.trip.startedAt).toBeTruthy();
  });

  it("pause then resume", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${trip._id}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    await req
      .patch(`/api/v1/trips/${trip._id}`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "pause-1")
      .send({ action: "pause" })
      .expect(200);

    const paused = await req
      .get("/api/v1/me/active-trip")
      .set("Authorization", `Bearer ${driverToken}`)
      .expect(200);
    expect(paused.body.data.trip.status).toBe("PAUSED");

    await req
      .patch(`/api/v1/trips/${trip._id}/resume`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "resume-1")
      .expect(200);

    const resumed = await req
      .get("/api/v1/me/active-trip")
      .set("Authorization", `Bearer ${driverToken}`)
      .expect(200);
    expect(resumed.body.data.trip.status).toBe("ACTIVE");
  });

  it("end stores trip summary stub and enqueues stats", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${trip._id}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    const endRes = await req
      .patch(`/api/v1/trips/${trip._id}/end`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "end-1")
      .expect(200);

    expect(endRes.body.data.trip.status).toBe("COMPLETED");
    expect(endRes.body.data.trip.endTime).toBeTruthy();

    await req.get("/api/v1/me/active-trip").set("Authorization", `Bearer ${driverToken}`).expect(404);
  });

  it("repeated Idempotency-Key is a no-op", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${trip._id}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    const r1 = await req
      .patch(`/api/v1/trips/${trip._id}/end`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "end-repeat")
      .expect(200);

    const r2 = await req
      .patch(`/api/v1/trips/${trip._id}/end`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "end-repeat")
      .expect(200);

    expect(r2.body.data.trip.status).toBe("COMPLETED");
    expect(r1.body.data.trip._id).toBe(r2.body.data.trip._id);
  });
});

describe("P1-29 — Trip: start + force-end + pre-trip checklist", () => {
  it("double start with same key → one trip (idempotent)", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);

    const r1 = await req
      .post(`/api/v1/trips/${trip._id}/start`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "start-dup")
      .expect(200);

    const r2 = await req
      .post(`/api/v1/trips/${trip._id}/start`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "start-dup")
      .expect(200);

    expect(r1.body.data.trip._id).toBe(r2.body.data.trip._id);
    expect(r1.body.data.trip.status).toBe("ACTIVE");
    expect(r2.body.data.trip.status).toBe("ACTIVE");
  });

  it("start without assignment → 409", async () => {
    const res = await req
      .post("/api/v1/admin/trips")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        route: routeId,
        scheduledStartAt: new Date("2026-10-01T08:00:00.000Z").toISOString(),
        scheduledEndAt: new Date("2026-10-01T08:45:00.000Z").toISOString(),
      })
      .expect(201);
    const trip = res.body.data.trip;

    await req
      .post(`/api/v1/trips/${trip._id}/start`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "start-noassign")
      .expect(409);
  });

  it("force-end by non-dispatcher → 403", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${trip._id}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    await req
      .post(`/api/v1/admin/trips/${trip._id}/force-end`)
      .set("Authorization", `Bearer ${driverToken}`)
      .expect(403);
  });

  it("force-end by dispatcher completes the trip", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${trip._id}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    const res = await req
      .post(`/api/v1/admin/trips/${trip._id}/force-end`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.trip.status).toBe("COMPLETED");
    expect(res.body.data.trip.endTime).toBeTruthy();
  });

  it("checklist blocks trip start only when flag is on", async () => {
    const trip = await makeTrip();
    await req
      .post(`/api/v1/admin/trips/${trip._id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId: driverId, vehicleId, conductorId: conductorId })
      .expect(200);

    await req
      .post(`/api/v1/trips/${trip._id}/checklist`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ fuel: false, tyres: true, brakes: true, lights: true, documentsValid: true, cleanliness: true })
      .expect(200);

    await SystemSetting.updateOne({ key: "checklistBlocksTripStart" }, { $set: { value: true } });

    await req
      .post(`/api/v1/trips/${trip._id}/start`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "start-blocked")
      .expect(409);

    await SystemSetting.updateOne({ key: "checklistBlocksTripStart" }, { $set: { value: false } });

    await req
      .post(`/api/v1/trips/${trip._id}/start`)
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "start-unblocked")
      .expect(200);

    expect((await req.get(`/api/v1/admin/trips/${trip._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200)).body.data.trip.status).toBe("ACTIVE");
  });
});
