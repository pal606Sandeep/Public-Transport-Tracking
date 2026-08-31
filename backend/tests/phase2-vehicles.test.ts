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

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let passengerToken: string;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
});

afterAll(async () => {
  await shutdown();
});

describe("P1-23 — Vehicle Management", () => {
  it("passenger (no MANAGE vehicle) cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/vehicles").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a vehicle (reg number unique, accessibility + amenities)", async () => {
    const res = await req
      .post("/api/v1/admin/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        registrationNumber: "KA-01-AB-1234",
        model: "TATA Starbus",
        type: "STANDARD",
        capacity: 40,
        fuelType: "CNG",
        gpsDeviceId: "GPS-001",
        wheelchairAccessible: true,
        amenities: { usb: true, ac: true },
      })
      .expect(201);
    const v = res.body.data.vehicle;
    expect(v.registrationNumber).toBe("KA-01-AB-1234");
    expect(v.wheelchairAccessible).toBe(true);
    expect(v.amenities.usb).toBe(true);
    expect(v.status).toBe("ACTIVE");
  });

  it("duplicate registrationNumber → 409", async () => {
    await req
      .post("/api/v1/admin/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        registrationNumber: "KA-01-AB-1234",
        type: "STANDARD",
        capacity: 40,
      })
      .expect(409);
  });

  it("list + search + status filter", async () => {
    const all = await req
      .get("/api/v1/admin/vehicles?limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    const found = await req
      .get("/api/v1/admin/vehicles?search=KA-01-AB-1234&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.vehicles.some((v: { registrationNumber: string }) => v.registrationNumber === "KA-01-AB-1234")).toBe(true);
  });

  it("status transition ACTIVE → MAINTENANCE records history; passenger read includes accessibility + amenities", async () => {
    const list = await req.get("/api/v1/admin/vehicles?search=KA-01-AB-1234&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const id = list.body.data.vehicles[0]._id;

    await req
      .patch(`/api/v1/admin/vehicles/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "MAINTENANCE", statusNote: "Brake service" })
      .expect(200);

    const after = await req.get(`/api/v1/admin/vehicles/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(after.body.data.vehicle.status).toBe("MAINTENANCE");
    expect(after.body.data.vehicle.history.some((h: { status: string }) => h.status === "MAINTENANCE")).toBe(true);

    // Passenger-facing read exposes accessibility + amenities (even if status hidden)
    const pass = await req.get(`/api/v1/vehicles/${id}`).set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(pass.body.data.vehicle.wheelchairAccessible).toBe(true);
    expect(pass.body.data.vehicle.amenities.ac).toBe(true);
  });

  it("assign driver/conductor/route", async () => {
    const list = await req.get("/api/v1/admin/vehicles?search=KA-01-AB-1234&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const id = list.body.data.vehicles[0]._id;

    const res = await req
      .post(`/api/v1/admin/vehicles/${id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        driverId: "0123456789abcdef01234567",
        conductorId: "0123456789abcdef01234568",
        routeId: "0123456789abcdef01234569",
      })
      .expect(200);
    expect(res.body.data.vehicle.assignedDriver._id).toBeTruthy();
    expect(res.body.data.vehicle.assignedConductor._id).toBeTruthy();
    expect(res.body.data.vehicle.assignedRoute._id).toBeTruthy();
  });

  it("delete soft-removes (excluded from list, recoverable via includeDeleted)", async () => {
    const created = await req
      .post("/api/v1/admin/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ registrationNumber: "DEL-XX-0000", type: "STANDARD", capacity: 30 })
      .then((r) => r.body.data.vehicle) as { _id: string };
    await req.delete(`/api/v1/admin/vehicles/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const gone = await req
      .get("/api/v1/admin/vehicles?search=DEL-XX-0000&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(gone.body.data.vehicles).toHaveLength(0);

    const found = await req
      .get(`/api/v1/admin/vehicles/${created._id}?includeDeleted=true`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.vehicle.registrationNumber).toBe("DEL-XX-0000");
  });
});
