import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD, loginToken } from "./support.js";
import { Role } from "../src/models/role.model.js";
import { AuditLog } from "../src/models/auditLog.model.js";
import { canAccessResource } from "../src/middlewares/rbac.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-14 — RBAC roles, permissions, mapping", () => {
  it("seed creates all 10 roles with their permissions", async () => {
    const roles = await Role.find({}).lean();
    expect(roles.length).toBe(10);
    const superAdmin = roles.find((r) => r.code === "SUPER_ADMIN");
    expect(superAdmin?.permissions).toContain("MANAGE");
  });

  it("admin can update a role->permission mapping (audited)", async () => {
    const adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);

    const updated = await req
      .put("/api/v1/rbac/roles/PASSENGER/permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ permissions: ["VIEW"] })
      .expect(200);
    expect(updated.body.data.role.permissions).toEqual(["VIEW"]);

    // Audit entry written.
    const log = await AuditLog.findOne({ action: "role.permissions.update" }).lean();
    expect(log).toBeTruthy();
    expect(log?.resourceId).toBe("PASSENGER");
  });

  it("system role modification is restricted to admin roles", async () => {
    const userToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
    // Passenger lacks MANAGE entirely -> 403 at the guard level.
    await req
      .put("/api/v1/rbac/roles/PASSENGER/permissions")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ permissions: ["VIEW"] })
      .expect(403);
  });
});

describe("P1-15 — Permission middleware + resource authorization", () => {
  it("role without the required permission is denied (403)", async () => {
    const userToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
    const res = await req
      .get("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("SUPER_ADMIN bypasses where intended", async () => {
    const adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
    await req.get("/api/v1/rbac/roles").set("Authorization", `Bearer ${adminToken}`).expect(200);
  });

  it("unauthenticated request is rejected (401)", async () => {
    await req.get("/api/v1/rbac/roles").expect(401);
  });

  it("resource authz: owner may access own record, others cannot", async () => {
    // Owner (same user id) with VIEW passes.
    const own = canAccessResource(
      { user: { id: "owner-1", role: "PASSENGER", permissions: ["VIEW"] } } as never,
      "owner-1",
      "VIEW",
      "resource"
    );
    expect(own).toBe(true);

    // Non-owner without :any scope fails.
    const other = canAccessResource(
      { user: { id: "other", role: "PASSENGER", permissions: ["VIEW"] } } as never,
      "owner-1",
      "VIEW",
      "resource"
    );
    expect(other).toBe(false);

    // Non-owner with MANAGE passes.
    const admin = canAccessResource(
      { user: { id: "admin", role: "ADMIN", permissions: [] } } as never,
      "owner-1",
      "VIEW",
      "resource"
    );
    expect(admin).toBe(true);
  });
});
