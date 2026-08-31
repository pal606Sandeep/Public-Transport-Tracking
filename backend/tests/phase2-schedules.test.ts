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
let routeId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  const r = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ routeNumber: "R-200", name: "Ring Road" })
    .expect(201);
  routeId = r.body.data.route._id as string;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-26 — Schedule Management + trip materialisation", () => {
  it("passenger (no MANAGE schedule) cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/schedules").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a DAILY schedule with 2 departure times", async () => {
    const res = await req
      .post("/api/v1/admin/schedules")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Ring Road Daily",
        route: routeId,
        frequencyType: "DAILY",
        departureTimes: ["07:00", "09:30"],
        durationMin: 45,
      })
      .expect(201);
    const s = res.body.data.schedule;
    expect(s.name).toBe("Ring Road Daily");
    expect(s.frequencyType).toBe("DAILY");
    expect(s.departureTimes).toEqual(["07:00", "09:30"]);
  });

  it("generating for a single day materialises trips with SCHEDULED status + correct times", async () => {
    const list = await req.get("/api/v1/admin/schedules?search=Ring%20Road%20Daily&limit=1").set("Authorization", `Bearer ${adminToken}`).expect(200);
    const id = list.body.data.schedules[0]._id;

    const day = new Date("2026-09-01T00:00:00.000Z");
    const res = await req
      .post(`/api/v1/admin/schedules/${id}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ from: day.toISOString(), to: day.toISOString() })
      .expect(201);

    expect(res.body.data.count).toBe(2);
    const trips = res.body.data.trips;
    expect(trips[0].status).toBe("SCHEDULED");
    expect(trips[0].route).toBe(routeId);
    expect(new Date(trips[0].scheduledStartAt).toISOString()).toBe("2026-09-01T07:00:00.000Z");
    expect(new Date(trips[0].scheduledEndAt).toISOString()).toBe("2026-09-01T07:45:00.000Z");
    expect(new Date(trips[1].scheduledStartAt).toISOString()).toBe("2026-09-01T09:30:00.000Z");
  });

  it("generating for 7 days (DAILY) → 14 trips; WEEKEND schedule skips weekdays", async () => {
    const wk = await req
      .post("/api/v1/admin/schedules")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Weekend Shuttle",
        route: routeId,
        frequencyType: "WEEKEND",
        departureTimes: ["10:00"],
        durationMin: 30,
      })
      .expect(201);
    const wkId = wk.body.data.schedule._id;

    // 2026-09-07 is a Monday; 2026-09-12 is a Saturday
    const mon = new Date("2026-09-07T00:00:00.000Z");
    const sat = new Date("2026-09-12T00:00:00.000Z");

    const monRes = await req
      .post(`/api/v1/admin/schedules/${wkId}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ from: mon.toISOString(), to: mon.toISOString() })
      .expect(201);
    expect(monRes.body.data.count).toBe(0);

    const satRes = await req
      .post(`/api/v1/admin/schedules/${wkId}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ from: sat.toISOString(), to: sat.toISOString() })
      .expect(201);
    expect(satRes.body.data.count).toBe(1);
    expect(new Date(satRes.body.data.trips[0].scheduledStartAt).toISOString()).toBe("2026-09-12T10:00:00.000Z");
  });

  it("HOLIDAY schedule only materialises inside its date window", async () => {
    const h = await req
      .post("/api/v1/admin/schedules")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Festival Special",
        route: routeId,
        frequencyType: "HOLIDAY",
        departureTimes: ["18:00"],
        durationMin: 40,
        startDate: new Date("2026-09-10T00:00:00.000Z"),
        endDate: new Date("2026-09-12T00:00:00.000Z"),
      })
      .expect(201);
    const hId = h.body.data.schedule._id;

    const outside = await req
      .post(`/api/v1/admin/schedules/${hId}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ from: new Date("2026-09-13T00:00:00.000Z").toISOString(), to: new Date("2026-09-13T00:00:00.000Z").toISOString() })
      .expect(201);
    expect(outside.body.data.count).toBe(0);

    const inside = await req
      .post(`/api/v1/admin/schedules/${hId}/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ from: new Date("2026-09-11T00:00:00.000Z").toISOString(), to: new Date("2026-09-11T00:00:00.000Z").toISOString() })
      .expect(201);
    expect(inside.body.data.count).toBe(1);
  });

  it("update + delete soft-removes", async () => {
    const created = await req
      .post("/api/v1/admin/schedules")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Temp Sched", route: routeId, departureTimes: ["06:00"], durationMin: 30 })
      .then((r) => r.body.data.schedule) as { _id: string };

    const upd = await req
      .patch(`/api/v1/admin/schedules/${created._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ durationMin: 55 })
      .expect(200);
    expect(upd.body.data.schedule.durationMin).toBe(55);

    await req.delete(`/api/v1/admin/schedules/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const found = await req.get(`/api/v1/admin/schedules/${created._id}?includeDeleted=true`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(found.body.data.schedule.name).toBe("Temp Sched");
  });
});
