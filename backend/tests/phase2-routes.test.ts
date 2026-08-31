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

async function createStop(name: string, lng: number, lat: number): Promise<string> {
  const r = await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name, location: { type: "Point", coordinates: [lng, lat] } })
    .expect(201);
  return r.body.data.stop._id as string;
}

let stopA = "";
let stopB = "";
let stopC = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  stopA = await createStop("Route Stop A", 77.0, 12.0);
  stopB = await createStop("Route Stop B", 77.1, 12.1);
  stopC = await createStop("Route Stop C", 77.2, 12.2);
});

afterAll(async () => {
  await shutdown();
});

describe("P1-24 — Route Management + route-stop management", () => {
  it("passenger (no MANAGE route) cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/routes").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a route with ordered stops + LineString geometry", async () => {
    const res = await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        routeNumber: "R-101",
        name: "Airport Line",
        source: stopA,
        destination: stopC,
        distanceKm: 22.5,
        estimatedDurationMin: 45,
        direction: "OUTBOUND",
        geometry: {
          type: "LineString",
          coordinates: [
            [77.0, 12.0],
            [77.1, 12.1],
            [77.2, 12.2],
          ],
        },
        orderedStops: [
          { stopId: stopB, sequence: 2, scheduledOffsetMinutes: 20 },
          { stopId: stopA, sequence: 0, scheduledOffsetMinutes: 0 },
          { stopId: stopC, sequence: 1, scheduledOffsetMinutes: 10 },
        ],
      })
      .expect(201);
    const route = res.body.data.route;
    expect(route.routeNumber).toBe("R-101");
    expect(route.geometry.type).toBe("LineString");
    // sequence re-numbered to be contiguous in sorted order
    expect(route.orderedStops.map((s: { sequence: number }) => s.sequence)).toEqual([0, 1, 2]);
    expect(route.orderedStops.map((s: { stopId: string }) => s.stopId)).toEqual([stopA, stopC, stopB]);
    expect(route.stops).toHaveLength(3);
  });

  it("invalid LineString geometry (single point) → 400", async () => {
    await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        routeNumber: "R-BAD",
        geometry: { type: "LineString", coordinates: [[77.0, 12.0]] },
      })
      .expect(400);
  });

  it("duplicate routeNumber → 409", async () => {
    await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ routeNumber: "R-101" })
      .expect(409);
  });

  it("add stop keeps sequence contiguous + denormalised stops; remove + reorder", async () => {
    const list = await req.get("/api/v1/admin/routes?search=R-101&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const id = list.body.data.routes[0]._id;

    // add new stop C (already present) → conflict
    await req.post(`/api/v1/admin/routes/${id}/stops`).set("Authorization", `Bearer ${adminToken}`).send({ stopId: stopC, sequence: 99 }).expect(409);

    // reorder to [A, C, B] → [B, A, C]
    const reordered = await req
      .put(`/api/v1/admin/routes/${id}/stops/order`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ stopIds: [stopB, stopA, stopC] })
      .expect(200);
    expect(reordered.body.data.route.orderedStops.map((s: { sequence: number }) => s.sequence)).toEqual([0, 1, 2]);
    expect(reordered.body.data.route.orderedStops.map((s: { stopId: string }) => s.stopId)).toEqual([stopB, stopA, stopC]);

    // remove stop A → remaining [B, C] renumbered to [0,1]
    const removed = await req
      .delete(`/api/v1/admin/routes/${id}/stops/${stopA}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(removed.body.data.route.orderedStops.map((s: { sequence: number }) => s.sequence)).toEqual([0, 1]);
    expect(removed.body.data.route.stops).toHaveLength(2);
  });

  it("passenger-facing read exposes geometry + ordered stops", async () => {
    const list = await req.get("/api/v1/admin/routes?search=R-101&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const id = list.body.data.routes[0]._id;
    const res = await req.get(`/api/v1/routes/${id}`).set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(res.body.data.route.geometry.type).toBe("LineString");
    expect(res.body.data.route.orderedStops.length).toBeGreaterThanOrEqual(2);
  });

  it("deactivate hides from active reads; delete soft-removes", async () => {
    const created = await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ routeNumber: "R-DEL", orderedStops: [{ stopId: stopA, sequence: 0, scheduledOffsetMinutes: 0 }] })
      .then((r) => r.body.data.route) as { _id: string };

    await req.post(`/api/v1/admin/routes/${created._id}/deactivate`).set("Authorization", `Bearer ${adminToken}`).expect(200);

    await req.delete(`/api/v1/admin/routes/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const gone = await req.get("/api/v1/admin/routes?search=R-DEL&limit=50").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(gone.body.data.routes.some((r: { _id: string }) => r._id === created._id)).toBe(false);

    const found = await req.get(`/api/v1/admin/routes/${created._id}?includeDeleted=true`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(found.body.data.route.routeNumber).toBe("R-DEL");
  });
});
