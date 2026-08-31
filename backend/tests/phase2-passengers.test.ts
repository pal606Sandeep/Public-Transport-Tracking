import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
} from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let passengerToken: string;
let driverToken: string;
let passengerUserId = "";
const OBJID = "0123456789abcdef01234567";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);

  const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${passengerToken}`).expect(200);
  passengerUserId = me.body.data.user._id;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-20 — Passenger Management", () => {
  it("guest cannot access passenger endpoints → 401", async () => {
    await req.get("/api/v1/passengers/me").expect(401);
  });

  it("GET /me auto-creates a passenger profile", async () => {
    const res = await req
      .get("/api/v1/passengers/me")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(res.body.data.passenger.userId).toBe(passengerUserId);
    expect(res.body.data.passenger.blocked).toBe(false);
  });

  it("PATCH /me updates preferences", async () => {
    const res = await req
      .patch("/api/v1/passengers/me")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ theme: "dark", language: "hi" })
      .expect(200);
    expect(res.body.data.passenger.preferences.theme).toBe("dark");
  });

  it("favourites CRUD + dedup", async () => {
    await req
      .post("/api/v1/passengers/me/favourites")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: OBJID })
      .expect(201);
    // Duplicate is deduped.
    await req
      .post("/api/v1/passengers/me/favourites")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: OBJID })
      .expect(201);
    await req
      .post("/api/v1/passengers/me/favourites")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "stop", targetId: "abcdef0123456789abcdef01" })
      .expect(201);

    const list = await req
      .get("/api/v1/passengers/me/favourites")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(list.body.data.routes).toHaveLength(1);
    expect(list.body.data.stops).toHaveLength(1);

    await req
      .delete(`/api/v1/passengers/me/favourites/${OBJID}?type=route`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    const after = await req
      .get("/api/v1/passengers/me/favourites")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(after.body.data.routes).toHaveLength(0);
  });

  it("invalid favourite targetId → 400", async () => {
    await req
      .post("/api/v1/passengers/me/favourites")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: "not-an-id" })
      .expect(400);
  });

  it("saved locations CRUD", async () => {
    const created = await req
      .post("/api/v1/passengers/me/saved-locations")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ name: "Home", location: { lng: 77.2, lat: 28.6 }, isHome: true })
      .expect(201);
    const id = created.body.data.location._id;

    const list = await req
      .get("/api/v1/passengers/me/saved-locations")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(list.body.data.locations).toHaveLength(1);
    expect(list.body.data.locations[0].name).toBe("Home");

    await req
      .patch(`/api/v1/passengers/me/saved-locations/${id}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ name: "HQ" })
      .expect(200);

    await req
      .delete(`/api/v1/passengers/me/saved-locations/${id}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
  });

  it("recent searches are deduped and capped at 10", async () => {
    for (let i = 0; i < 12; i++) {
      await req
        .post("/api/v1/passengers/me/recent-searches")
        .set("Authorization", `Bearer ${passengerToken}`)
        .send({ type: "route", term: `term-${i}` })
        .expect(201);
    }
    const list = await req
      .get("/api/v1/passengers/me/recent-searches")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(list.body.data.searches).toHaveLength(10);

    // Recording the same term again bumps it instead of adding a duplicate.
    await req
      .post("/api/v1/passengers/me/recent-searches")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", term: "term-0" })
      .expect(201);
    const after = await req
      .get("/api/v1/passengers/me/recent-searches")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(after.body.data.searches).toHaveLength(10);
    expect(after.body.data.searches[0].term).toBe("term-0");

    // Delete one + clear all.
    const one = after.body.data.searches[0]._id;
    await req
      .delete(`/api/v1/passengers/me/recent-searches/${one}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    await req
      .delete("/api/v1/passengers/me/recent-searches")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    const cleared = await req
      .get("/api/v1/passengers/me/recent-searches")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(cleared.body.data.searches).toHaveLength(0);
  });

  it("admin can block and unblock a passenger; non-admin cannot", async () => {
    // Driver (no MANAGE passenger) → 403.
    await req
      .post(`/api/v1/admin/passengers/${passengerUserId}/block`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ reason: "nope" })
      .expect(403);

    await req
      .post(`/api/v1/admin/passengers/${passengerUserId}/block`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "rule violation" })
      .expect(200);

    const blocked = await req
      .get("/api/v1/passengers/me")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(blocked.body.data.passenger.blocked).toBe(true);
    expect(blocked.body.data.passenger.blockedReason).toBe("rule violation");

    await req
      .post(`/api/v1/admin/passengers/${passengerUserId}/unblock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const unblocked = await req
      .get("/api/v1/passengers/me")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(unblocked.body.data.passenger.blocked).toBe(false);
  });
});
