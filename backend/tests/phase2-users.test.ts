import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

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

describe("P1-19 — User Management (admin-namespaced)", () => {
  let createdId = "";

  it("RBAC: passenger cannot access admin user routes → 403", async () => {
    await req
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(403);
  });

  it("admin can create a user (no password leaked)", async () => {
    const res = await req
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Alice Driver",
        email: "alice@transit.test",
        password: "SecretPass123!",
        role: "DRIVER",
      })
      .expect(201);
    createdId = res.body.data.user._id;
    expect(createdId).toBeTruthy();
    expect(res.body.data.user.role).toBe("DRIVER");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("duplicate email → 409", async () => {
    await req
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dup", email: "alice@transit.test", password: "SecretPass123!" })
      .expect(409);
  });

  it("lists users with pagination, search and role filter", async () => {
    const page1 = await req
      .get("/api/v1/admin/users?page=1&limit=2")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(page1.body.data.users).toHaveLength(2);
    expect(page1.body.data.pagination.total).toBeGreaterThan(2);

    const byRole = await req
      .get(`/api/v1/admin/users?role=PASSENGER&limit=50`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(byRole.body.data.users.every((u: { role: string }) => u.role === "PASSENGER")).toBe(true);

    const search = await req
      .get(`/api/v1/admin/users?search=alice&limit=50`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(search.body.data.users.some((u: { email: string }) => u.email === "alice@transit.test")).toBe(true);

    const sorted = await req
      .get("/api/v1/admin/users?sort=name&order=asc&limit=50")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const names = sorted.body.data.users.map((u: { name: string }) => u.name);
    expect([...names].sort()).toEqual(names);
  });

  it("get by id returns the user", async () => {
    const res = await req
      .get(`/api/v1/admin/users/${createdId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.user.email).toBe("alice@transit.test");
  });

  it("update changes role + name", async () => {
    const res = await req
      .patch(`/api/v1/admin/users/${createdId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Alice Updated", role: "CONDUCTOR" })
      .expect(200);
    expect(res.body.data.user.name).toBe("Alice Updated");
    expect(res.body.data.user.role).toBe("CONDUCTOR");
  });

  it("deactivate hides the user from the default list; activate restores it", async () => {
    await req
      .post(`/api/v1/admin/users/${createdId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    const gone = await req
      .get(`/api/v1/admin/users?search=alice&limit=50`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(gone.body.data.users.some((u: { email: string }) => u.email === "alice@transit.test")).toBe(false);

    // Direct get without includeDeleted → 404.
    await req.get(`/api/v1/admin/users/${createdId}`).set("Authorization", `Bearer ${adminToken}`).expect(404);
    // With includeDeleted → present and inactive.
    const withDel = await req
      .get(`/api/v1/admin/users/${createdId}?includeDeleted=true`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(withDel.body.data.user.isActive).toBe(false);

    await req
      .post(`/api/v1/admin/users/${createdId}/activate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const back = await req
      .get(`/api/v1/admin/users?search=alice&limit=50`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(back.body.data.users.some((u: { email: string }) => u.email === "alice@transit.test")).toBe(true);
  });

  it("cannot deactivate or delete your own account", async () => {
    const me = await req
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const myId = me.body.data.user._id;
    await req
      .post(`/api/v1/admin/users/${myId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(403);
    await req
      .delete(`/api/v1/admin/users/${myId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(403);
  });

  it("delete removes the user entirely", async () => {
    const res = await req
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Temp", email: "temp@transit.test", password: "SecretPass123!" })
      .expect(201);
    const id = res.body.data.user._id;
    await req.delete(`/api/v1/admin/users/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    await req.get(`/api/v1/admin/users/${id}?includeDeleted=true`).set("Authorization", `Bearer ${adminToken}`).expect(404);
  });

  it("validation: invalid role → 400", async () => {
    await req
      .post("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bad", email: "bad@transit.test", password: "SecretPass123!", role: "NOT_ROLE" })
      .expect(400);
  });
});
