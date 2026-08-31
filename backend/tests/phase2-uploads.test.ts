import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  userToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
});

afterAll(async () => {
  await shutdown();
});

describe("P1-32 — File Uploads (presign + local store)", () => {
  it("disallowed content-type → 400", async () => {
    await req
      .post("/api/v1/uploads/presign")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ purpose: "complaint", contentType: "text/html", sizeBytes: 1000 })
      .expect(400);
  });

  it("oversize → 400", async () => {
    await req
      .post("/api/v1/uploads/presign")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ purpose: "profile", contentType: "image/png", sizeBytes: 20 * 1024 * 1024 })
      .expect(400);
  });

  it("valid presign returns key + signed upload URL", async () => {
    const res = await req
      .post("/api/v1/uploads/presign")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ purpose: "complaint", contentType: "image/jpeg", sizeBytes: 4096 })
      .expect(200);
    expect(res.body.data.key).toMatch(/^complaint\//);
    expect(res.body.data.key).toMatch(/\.jpg$/);
    expect(res.body.data.contentType).toBe("image/jpeg");
    expect(res.body.data.url).toContain("/api/v1/uploads/");
    expect(res.body.data.url).toContain("token=");
  });

  it("PUT to the presigned URL stores bytes, then confirm accepts the key", async () => {
    const presign = await req
      .post("/api/v1/uploads/presign")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ purpose: "incident", contentType: "application/pdf", sizeBytes: 2048 })
      .expect(200);
    const { url, key } = presign.body.data;

    const put = await req.put(url).set("Content-Type", "application/pdf").send(Buffer.from("%PDF-1.4 mock file content"));
    expect(put.status).toBe(201);
    expect(put.body.data.stored).toBe(true);

    const confirm = await req.post("/api/v1/uploads/confirm").set("Authorization", `Bearer ${adminToken}`).send({ key }).expect(200);
    expect(confirm.body.data.accepted).toBe(true);
    expect(confirm.body.data.key).toBe(key);
  });

  it("unknown purpose → 400", async () => {
    await req
      .post("/api/v1/uploads/presign")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ purpose: "garbage", contentType: "image/png", sizeBytes: 100 })
      .expect(400);
  });

  it("unauthenticated presign → 401", async () => {
    await req.post("/api/v1/uploads/presign").send({ purpose: "profile", contentType: "image/png", sizeBytes: 100 }).expect(401);
  });
});
