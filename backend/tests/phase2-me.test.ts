import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DRIVER_EMAIL,
  DRIVER_PASSWORD,
  CONDUCTOR_EMAIL,
  CONDUCTOR_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let driverToken: string;
let conductorToken: string;
let passengerToken: string;
let driverId = "";
let routeId = "";
let vehicleId = "";

const DATE = "2026-11-05";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
  conductorToken = await loginToken(req, CONDUCTOR_EMAIL, CONDUCTOR_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${driverToken}`);
  const driverUserId = me.body.data.user._id;

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ routeNumber: "ME-400", name: "Me Loop" })
    .expect(201);
  routeId = route.body.data.route._id;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "ME-01-AB-2026", model: "Tata", type: "STANDARD", capacity: 35 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  const drv = await req
    .post("/api/v1/admin/drivers")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ user: driverUserId, name: "Me Driver", employeeId: "ME-EMP-1", licenseNumber: "ME-LIC-1", licenseExpiry: new Date("2030-01-01").toISOString() })
    .expect(201);
  driverId = drv.body.data.driver._id;

  await req
    .post(`/api/v1/admin/drivers/${driverId}/assign`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ vehicleId, routeId, scheduleId: null })
    .expect(200);

  const sched = await req
    .post("/api/v1/admin/schedules")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Me Daily",
      route: routeId,
      vehicle: vehicleId,
      driver: driverId,
      frequencyType: "DAILY",
      departureTimes: ["09:00", "13:00"],
      durationMin: 60,
    })
    .expect(201);
  const schedId = sched.body.data.schedule._id;

  await req
    .post(`/api/v1/admin/schedules/${schedId}/generate`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ from: `${DATE}T00:00:00.000Z`, to: `${DATE}T00:00:00.000Z` })
    .expect(201);
});

afterAll(async () => {
  await shutdown();
});

describe("P1-30 — My Assignment & Attendance", () => {
  it("non-staff (passenger) cannot read /me/assignments → 403", async () => {
    await req.get("/api/v1/me/assignments?date=2026-11-05").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("GET /me/assignments?date returns route, vehicle, shift and scheduled trips", async () => {
    const res = await req
      .get(`/api/v1/me/assignments?date=${DATE}`)
      .set("Authorization", `Bearer ${driverToken}`)
      .expect(200);
    const data = res.body.data;
    expect(data.staffType).toBe("DRIVER");
    expect(data.route._id).toBe(routeId);
    expect(data.scheduledTrips.length).toBe(2);
    expect(data.scheduledTrips[0].status).toBe("SCHEDULED");
    expect(data.scheduledTrips[0].vehicle).toBeDefined();
    expect(data.shift.type).toBeDefined();
  });

  it("POST /me/assignments/request creates a PENDING request", async () => {
    const res = await req
      .post("/api/v1/me/assignments/request")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ date: DATE, reason: "Swapped shift" })
      .expect(201);
    expect(res.body.data.status).toBe("PENDING");
  });

  it("DISPATCHER/admin approves a pending request", async () => {
    const list = await req
      .get("/api/v1/admin/assignment-requests?status=PENDING")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.data.requests.length).toBeGreaterThan(0);
    const id = list.body.data.requests[0]._id;

    const dec = await req
      .patch(`/api/v1/admin/assignment-requests/${id}/decision`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "APPROVE", note: "OK" })
      .expect(200);
    expect(dec.body.data.status).toBe("APPROVED");
  });

  it("conductor can also read own assignments", async () => {
    const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${conductorToken}`);
    const conductorUserId = me.body.data.user._id;
    await req
      .post("/api/v1/admin/conductors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ user: conductorUserId, name: "Me Conductor", employeeId: "ME-EMP-2" })
      .expect(201);
    const res = await req
      .get(`/api/v1/me/assignments?date=${DATE}`)
      .set("Authorization", `Bearer ${conductorToken}`)
      .expect(200);
    expect(res.body.data.staffType).toBe("CONDUCTOR");
  });

  it("check-in then check-out records attendance and returns duration", async () => {
    const inRes = await req.post("/api/v1/me/attendance/check-in").set("Authorization", `Bearer ${driverToken}`).send({}).expect(200);
    expect(inRes.body.data.checkIn).toBeTruthy();
    const outRes = await req.post("/api/v1/me/attendance/check-out").set("Authorization", `Bearer ${driverToken}`).send({}).expect(200);
    expect(outRes.body.data.checkOut).toBeTruthy();
    expect(typeof outRes.body.data.workedMinutes).toBe("number");
    expect(outRes.body.data.workedMinutes).toBeGreaterThanOrEqual(0);
  });
});
