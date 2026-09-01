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
import { SystemSetting } from "../src/models/systemSetting.model.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;
let guestToken: string;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-53 — System Settings (admin CRUD)", () => {
  it("guest + passenger cannot reach admin settings → 403", async () => {
    await req.get("/api/v1/admin/system-settings").set("Authorization", `Bearer ${passengerToken}`).expect(403);
    await req.get("/api/v1/admin/system-settings").set("Authorization", `Bearer ${guestToken}`).expect(403);
    await req.post("/api/v1/admin/system-settings").set("Authorization", `Bearer ${passengerToken}`).send({ key: "x", value: 1 }).expect(403);
  });

  it("unauthenticated → 401", async () => {
    await req.get("/api/v1/admin/system-settings").expect(401);
  });

  it("list includes seeded settings", async () => {
    const d = (await req
      .get("/api/v1/admin/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.settings.length).toBeGreaterThan(0);
    expect(d.settings.some((s: Record<string, unknown>) => s.key === "gpsSendIntervalSeconds")).toBe(true);
    expect(d.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("filter by q substring", async () => {
    const d = (await req
      .get("/api/v1/admin/system-settings?q=gps")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.settings.every((s: Record<string, unknown>) => String(s.key).includes("gps"))).toBe(true);
  });

  it("get one by key", async () => {
    const d = (await req
      .get("/api/v1/admin/system-settings/geofenceRadiusMeters")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.setting.key).toBe("geofenceRadiusMeters");
    expect(typeof d.setting.value).toBe("number");
  });

  it("create new setting → 201, audit log written", async () => {
    const key = `custom_${Date.now()}`;
    await req
      .post("/api/v1/admin/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key, value: 42, description: "test setting" })
      .expect(201);

    const d = (await req
      .get(`/api/v1/admin/system-settings/${key}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.setting.value).toBe(42);
    expect(d.setting.description).toBe("test setting");

    const audit = (await req
      .get(`/api/v1/admin/audit-logs?resource=system_setting&resourceId=${key}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(audit.logs.length).toBeGreaterThanOrEqual(1);
    expect(audit.logs[0].action).toBe("system_setting.create");
  });

  it("create duplicate key → 409", async () => {
    const key = `dup_${Date.now()}`;
    await req
      .post("/api/v1/admin/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key, value: 1 })
      .expect(201);
    await req
      .post("/api/v1/admin/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key, value: 2 })
      .expect(409);
  });

  it("create with invalid key (special chars) → 400", async () => {
    await req
      .post("/api/v1/admin/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "bad key!", value: "x" })
      .expect(400);
  });

  it("update setting value → 200, audit written", async () => {
    const key = "gpsSendIntervalSeconds";
    const before = await SystemSetting.findOne({ key }).lean();
    await req
      .patch(`/api/v1/admin/system-settings/${key}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ value: 15 })
      .expect(200);
    const after = await SystemSetting.findOne({ key }).lean();
    expect(after?.value).toBe(15);

    const audit = (await req
      .get(`/api/v1/admin/audit-logs?resource=system_setting&resourceId=${key}&action=system_setting.update`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(audit.logs.length).toBeGreaterThanOrEqual(1);
    expect((audit.logs[0].meta as { before: number }).before).toBe(before?.value);
    expect((audit.logs[0].meta as { after: number }).after).toBe(15);
  });

  it("update invalid threshold → 400 INVALID_SETTING_VALUE", async () => {
    await req
      .patch("/api/v1/admin/system-settings/gpsSendIntervalSeconds")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ value: 9999 })
      .expect(400);
  });

  it("update with invalid etaThresholds (not strictly ordered) → 400", async () => {
    await req
      .patch("/api/v1/admin/system-settings/etaThresholds")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ value: { low: 10, medium: 10, high: 10 } })
      .expect(400);
  });

  it("update reflected in /config", async () => {
    await req
      .patch("/api/v1/admin/system-settings/gpsSendIntervalSeconds")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ value: 30 })
      .expect(200);
    const cfg = (await req
      .get("/api/v1/config")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200)).body.data;
    expect(cfg.gpsSendIntervalSeconds).toBe(30);
  });

  it("bulk upsert creates + updates", async () => {
    const newKey = `bulk_new_${Date.now()}`;
    const r = (await req
      .put("/api/v1/admin/system-settings/bulk")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        settings: [
          { key: newKey, value: "hello" },
          { key: "gpsSendIntervalSeconds", value: 25 },
        ],
      })
      .expect(200)).body.data;
    expect(r.count).toBe(2);
    expect(r.results.some((x: { key: string; status: string }) => x.key === newKey && x.status === "created")).toBe(true);
    expect(r.results.some((x: { key: string; status: string }) => x.key === "gpsSendIntervalSeconds" && x.status === "updated")).toBe(true);
  });

  it("delete setting → 200, audit written, get returns 404", async () => {
    const key = `to_delete_${Date.now()}`;
    await req
      .post("/api/v1/admin/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key, value: 1 })
      .expect(201);
    await req
      .delete(`/api/v1/admin/system-settings/${key}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    await req
      .get(`/api/v1/admin/system-settings/${key}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});