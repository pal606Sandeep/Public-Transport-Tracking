import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CONDUCTOR_EMAIL,
  CONDUCTOR_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let conductorToken: string;
let passengerToken: string;
let conductorUserId = "";
let passengerUserId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  conductorToken = await loginToken(req, CONDUCTOR_EMAIL, CONDUCTOR_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${conductorToken}`);
  conductorUserId = me.body.data.user._id;
  const pme = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${passengerToken}`);
  passengerUserId = pme.body.data.user._id;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-22 — Conductor Management", () => {
  it("passenger (no MANAGE conductor) cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/conductors").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a conductor profile (no duplicate)", async () => {
    const res = await req
      .post("/api/v1/admin/conductors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user: conductorUserId,
        name: "Test Conductor",
        employeeId: "CEMP-001",
      })
      .expect(201);
    const d = res.body.data.conductor;
    expect(d.employeeId).toBe("CEMP-001");
    expect(d.status).toBe("ACTIVE");
    expect(d.ticketSales).toBe(0);
  });

  it("duplicate employeeId → 409", async () => {
    await req
      .post("/api/v1/admin/conductors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        user: conductorUserId,
        name: "Dup",
        employeeId: "CEMP-001",
      })
      .expect(409);
  });

  it("admin lists + search + status filter", async () => {
    const all = await req
      .get("/api/v1/admin/conductors?limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    const found = await req
      .get("/api/v1/admin/conductors?search=CEMP-001&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.conductors.some((d: { employeeId: string }) => d.employeeId === "CEMP-001")).toBe(true);
  });

  it("get by id + update + assign vehicle/route/schedule + status", async () => {
    const list = await req.get("/api/v1/admin/conductors?search=CEMP-001&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const conductor = list.body.data.conductors[0];
    const id = conductor._id;

    const got = await req.get(`/api/v1/admin/conductors/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(got.body.data.conductor.employeeId).toBe("CEMP-001");

    const upd = await req
      .patch(`/api/v1/admin/conductors/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ shift: { type: "NIGHT", start: "18:00", end: "02:00" } })
      .expect(200);
    expect(upd.body.data.conductor.shift.type).toBe("NIGHT");

    const assigned = await req
      .post(`/api/v1/admin/conductors/${id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vehicleId: "0123456789abcdef01234567", routeId: "0123456789abcdef01234568", scheduleId: null })
      .expect(200);
    expect(assigned.body.data.conductor.assigned.vehicleId).toBeTruthy();
    expect(assigned.body.data.conductor.assigned.routeId).toBeTruthy();
    expect(assigned.body.data.conductor.assigned.scheduleId).toBeNull();

    await req.post(`/api/v1/admin/conductors/${id}/status`).set("Authorization", `Bearer ${adminToken}`).send({ status: "ON_LEAVE" }).expect(200);
    const after = await req.get(`/api/v1/admin/conductors/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(after.body.data.conductor.status).toBe("ON_LEAVE");
  });

  it("attendance check-in/out recorded against shift day", async () => {
    const list = await req.get("/api/v1/admin/conductors?search=CEMP-001&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const id = list.body.data.conductors[0]._id;
    const today = new Date();
    const res = await req
      .post(`/api/v1/admin/conductors/${id}/attendance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: today.toISOString(), checkIn: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), checkOut: new Date().toISOString() })
      .expect(200);
    expect(res.body.data.conductor.attendance).toHaveLength(1);
    expect(res.body.data.conductor.attendance[0].checkIn).toBeTruthy();
    expect(res.body.data.conductor.attendance[0].checkOut).toBeTruthy();
  });

  it("delete soft-removes (excluded from list, recoverable via includeDeleted)", async () => {
    const created = await req
      .post("/api/v1/admin/conductors")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ user: passengerUserId, name: "Temp", employeeId: "CEMP-DEL" })
      .then((r) => r.body.data.conductor) as { _id: string };
    await req.delete(`/api/v1/admin/conductors/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const gone = await req
      .get("/api/v1/admin/conductors?search=CEMP-DEL&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(gone.body.data.conductors).toHaveLength(0);

    const found = await req
      .get(`/api/v1/admin/conductors/${created._id}?includeDeleted=true`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.conductor.employeeId).toBe("CEMP-DEL");
  });
});
