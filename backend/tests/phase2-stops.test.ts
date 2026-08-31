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

describe("P1-25 — Stop Management", () => {
  it("passenger (no MANAGE stop) cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/stops").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a stop (name, code, Point location, facilities, accessibility)", async () => {
    const res = await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Central Station",
        code: "CENTRAL",
        location: { type: "Point", coordinates: [77.5946, 12.9716] },
        address: "MG Road",
        facilities: ["bench", "shelter"],
        accessibility: true,
        nearbyLandmarks: ["MG Road Metro"],
      })
      .expect(201);
    const s = res.body.data.stop;
    expect(s.name).toBe("Central Station");
    expect(s.code).toBe("CENTRAL");
    expect(s.location.coordinates).toEqual([77.5946, 12.9716]);
    expect(s.accessibility).toBe(true);
  });

  it("invalid coordinate order (not [lng, lat]) → 400", async () => {
    await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Bad Stop",
        location: { type: "Point", coordinates: [12.97] },
      })
      .expect(400);
  });

  it("list + search + deactivate", async () => {
    const all = await req
      .get("/api/v1/admin/stops?limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(all.body.data.pagination.total).toBeGreaterThanOrEqual(1);

    const found = await req
      .get("/api/v1/admin/stops?search=CENTRAL&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.stops.some((s: { code: string }) => s.code === "CENTRAL")).toBe(true);

    const c = found.body.data.stops.find((s: { code: string }) => s.code === "CENTRAL");
    const deactivated = await req
      .post(`/api/v1/admin/stops/${c._id}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(deactivated.body.data.stop.isActive).toBe(false);
  });

  it("passenger-facing nearest-stop ($near via ?lng=&lat=) works", async () => {
    // Create a second stop near Central
    await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Next Stop",
        location: { type: "Point", coordinates: [77.5947, 12.9717] },
      })
      .expect(201);

    const near = await req
      .get("/api/v1/stops?lng=77.5946&lat=12.9716&maxDistance=500")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(near.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    expect(near.body.data.stops.some((s: { name: string }) => s.name === "Next Stop")).toBe(true);
  });

  it("delete soft-removes (excluded from list, recoverable via includeDeleted)", async () => {
    const created = await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Temp Stop", location: { type: "Point", coordinates: [77.6, 12.9] } })
      .then((r) => r.body.data.stop) as { _id: string };

    await req.delete(`/api/v1/admin/stops/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const gone = await req
      .get("/api/v1/admin/stops?search=Temp%20Stop&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(gone.body.data.stops.some((s: { _id: string }) => s._id === created._id)).toBe(false);

    const found = await req
      .get(`/api/v1/admin/stops/${created._id}?includeDeleted=true`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.stop.name).toBe("Temp Stop");
  });
});
