import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";
import { AuditLog } from "../src/models/auditLog.model.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;
let guestToken: string;

const now = Date.now();

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;

  // Seed isolated audit entries with before/after (immutable record of a mutation).
  await AuditLog.create({
    actorId: new Types.ObjectId(),
    actorRole: "passenger",
    action: "user.create",
    resource: "user",
    resourceId: new Types.ObjectId().toString(),
    meta: { before: null, after: { name: "New User" } },
    severity: "INFO",
    createdAt: new Date(now - 1000),
  });
  await AuditLog.create({
    actorId: new Types.ObjectId(),
    actorRole: "admin",
    action: "route.deactivate",
    resource: "route",
    resourceId: new Types.ObjectId().toString(),
    meta: { before: { status: "ACTIVE" }, after: { status: "INACTIVE" } },
    severity: "WARN",
    createdAt: new Date(now - 2000),
  });
});

afterAll(async () => {
  await shutdown();
});

describe("P1-52 — Audit Logs", () => {
  it("guest and passenger cannot read audit logs → 403", async () => {
    await req.get("/api/v1/admin/audit-logs").set("Authorization", `Bearer ${passengerToken}`).expect(403);
    await req.get("/api/v1/admin/audit-logs").set("Authorization", `Bearer ${guestToken}`).expect(403);
    await req.get("/api/v1/admin/audit-logs/000000000000000000000000").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("list returns seeded audit entries with before/after meta", async () => {
    const d = (await req
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.logs.length).toBeGreaterThanOrEqual(2);
    expect(d.pagination.totalPages).toBeGreaterThanOrEqual(1);
    const routeLog = d.logs.find((l: Record<string, unknown>) => l.resource === "route");
    expect(routeLog).toBeTruthy();
    expect((routeLog.meta as { before: Record<string, unknown> }).before.status).toBe("ACTIVE");
    expect((routeLog.meta as { after: Record<string, unknown> }).after.status).toBe("INACTIVE");
    expect(routeLog.action).toBe("route.deactivate");
    expect(routeLog.severity).toBe("WARN");
  });

  it("filter list by resource", async () => {
    const d = (await req
      .get("/api/v1/admin/audit-logs?resource=user")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.logs.length).toBeGreaterThanOrEqual(1);
    expect(d.logs.every((l: Record<string, unknown>) => l.resource === "user")).toBe(true);
  });

  it("a real admin mutation writes an audit entry (create route)", async () => {
    await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        routeNumber: "AUDIT-9",
        name: "Audit Route",
        distanceKm: 5,
        estimatedDurationMin: 15,
        geometry: { type: "LineString", coordinates: [[73.85, 18.5], [73.86, 18.51]] },
      })
      .expect(201);
    const d = (await req
      .get("/api/v1/admin/audit-logs?resource=route&action=route.create")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.logs.length).toBeGreaterThanOrEqual(1);
    expect(d.logs.every((l: Record<string, unknown>) => l.resourceId && l.action === "route.create")).toBe(true);
  });

  it("immutable — no update or delete endpoint exists (404)", async () => {
    const id = "000000000000000000000000";
    for (const method of ["patch", "put", "delete"] as const) {
      await req[method](`/api/v1/admin/audit-logs/${id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    }
  });
});