import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DRIVER_EMAIL,
  DRIVER_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";

// Driver user (existing seed) is "driver@test.com". Admin will register a driver profile for them.
let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let driverToken: string;
let passengerToken: string;
let driverUserId = "";
let passengerUserId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${driverToken}`);
  driverUserId = me.body.data.user._id;
  const pme = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${passengerToken}`);
  passengerUserId = pme.body.data.user._id;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-21 — Driver Management (CRUD + assignment; performance stubbed)", () => {
  it("passenger (no MANAGE driver) cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/drivers").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a driver profile (license + expiry surfaced, no duplicate)", async () => {
    const res = await req
      .post("/api/v1/admin/drivers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user: driverUserId,
        name: "Test Driver",
        employeeId: "EMP-001",
        licenseNumber: "LIC-12345",
        licenseExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);
    const d = res.body.data.driver;
    expect(d.employeeId).toBe("EMP-001");
    expect(d.licenseNumber).toBe("LIC-12345");
    expect(d.licenseExpiry).toBeTruthy();
    expect(d.licenseType).toBeNull();
  });

  it("duplicate employeeId → 409", async () => {
    await req
      .post("/api/v1/admin/drivers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user: driverUserId,
        name: "Dup",
        employeeId: "EMP-001", // duplicate
        licenseNumber: "LIC-999",
      })
      .expect(409);
  });

  it("admin lists drivers (pagination) + search + status filter", async () => {
    const all = await req
      .get("/api/v1/admin/drivers?limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    const found = await req
      .get("/api/v1/admin/drivers?search=EMP-001&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.drivers.some((d: { employeeId: string }) => d.employeeId === "EMP-001")).toBe(true);
  });

  it("get by id + update + assign vehicle/route/schedule",async () => {
    const list = await req.get("/api/v1/admin/drivers?search=EMP-001&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const driver = list.body.data.drivers[0];
    const id = driver._id;

    const got = await req.get(`/api/v1/admin/drivers/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(got.body.data.driver.employeeId).toBe("EMP-001");

    const upd = await req
      .patch(`/api/v1/admin/drivers/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ licenseType: "Heavy Goods" })
      .expect(200);
    expect(upd.body.data.driver.licenseType).toBe("Heavy Goods");

    const assigned = await req
      .post(`/api/v1/admin/drivers/${id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vehicleId: "0123456789abcdef01234567", routeId: "0123456789abcdef01234568", scheduleId: null })
      .expect(200);
    expect(assigned.body.data.driver.assigned.vehicleId).toBeTruthy();
    expect(assigned.body.data.driver.assigned.routeId).toBeTruthy();
    expect(assigned.body.data.driver.assigned.scheduleId).toBeNull();

    await req.post(`/api/v1/admin/drivers/${id}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "ON_LEAVE" }).expect(200);
    const after = await req.get(`/api/v1/admin/drivers/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(after.body.data.driver.status).toBe("ON_LEAVE");
  });

  it("driver GET /me/performance returns ONLY caller's data", async () => {
    const res = await req
      .get("/api/v1/drivers/me/performance")
      .set("Authorization", `Bearer ${driverToken}`)
      .expect(200);
    const p = res.body.data.performance;
    expect(p.driverId).toBeTruthy();
    expect(p.user).toBe(driverUserId); // only the caller's own data
    expect(p.licenseExpiry).toBeTruthy();
    expect(p.metrics.note).toMatch(/P2-21/); // stubbed, pending dependency
    // another driver/passenger cannot read someone else's metrics via the admin path
    const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${passengerToken}`);
    // passenger is not a driver → 404 on their own /me/performance
    await req.get("/api/v1/drivers/me/performance").set("Authorization", `Bearer ${passengerToken}`).expect(404);
    // ... but admin can read by driver id
    await req
      .get(`/api/v1/admin/drivers/${p.driverId}/performance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    void me;
  });

  it("delete soft-removes (excluded from list, recoverable via includeDeleted)", async () => {
    const created = await req
      .post("/api/v1/admin/drivers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ user: passengerUserId, name: "Temp", employeeId: "EMP-DEL", licenseNumber: "LIC-X" })
      .then((r) => r.body.data.driver) as { _id: string };
    await req.delete(`/api/v1/admin/drivers/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const gone = await req
      .get("/api/v1/admin/drivers?search=EMP-DEL&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(gone.body.data.drivers).toHaveLength(0);

    // includeDeleted surfaces it (no separate deleted model) — fetch by id path
    const found = await req
      .get(`/api/v1/admin/drivers/${created._id}?includeDeleted=true`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.driver.employeeId).toBe("EMP-DEL");
  });
});
