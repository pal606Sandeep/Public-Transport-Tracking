import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let uri: string;
let guestToken: string;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  uri = b.uri;
  const guest = await req.post("/api/v1/auth/guest").expect(200);
  guestToken = guest.body.data.token;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-05 — Standard error envelope + traceId", () => {
  it("returns the standard envelope for a route-not-found (404) with traceId", async () => {
    const res = await req.get("/api/v1/does-not-exist").expect(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(typeof res.body.error.message).toBe("string");
    expect(typeof res.body.error.traceId).toBe("string");
    expect(res.headers["x-request-id"]).toBe(res.body.error.traceId);
  });

  it("maps zod validation failure to VALIDATION_ERROR with field details", async () => {
    const res = await req
      .post("/api/v1/auth/register")
      .send({ name: "", email: "not-an-email", password: "123" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
    expect(res.body.error.details.email).toBeDefined();
  });

  it("does not leak an internal stack trace (unknown error handler present)", async () => {
    const res = await req.post("/api/v1/auth/register").send({ name: "X", email: "x@y.com", password: "abc123" });
    // Either created (201) or a structured error; never a raw stack trace.
    expect(res.body.error === undefined || res.body.error.traceId).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain("\n    at ");
  });
});

describe("P1-04 — Idempotency-Key middleware", () => {
  it("replays the identical stored response for the same key + body", async () => {
    const body = { note: "start-trip" };
    const first = await req
      .post("/api/v1/demo/idempotent")
      .set("idempotency-key", "key-1")
      .send(body)
      .expect(201);

    // Give the async store a moment to persist.
    await new Promise((r) => setTimeout(r, 50));
    const second = await req
      .post("/api/v1/demo/idempotent")
      .set("idempotency-key", "key-1")
      .send(body)
      .expect(201);

    expect(second.body).toEqual(first.body); // same `at` => not re-executed
  });

  it("rejects a conflicting (different) body for the same key", async () => {
    await req
      .post("/api/v1/demo/idempotent")
      .set("idempotency-key", "key-2")
      .send({ a: 1 })
      .expect(201);
    await new Promise((r) => setTimeout(r, 50));
    const res = await req
      .post("/api/v1/demo/idempotent")
      .set("idempotency-key", "key-2")
      .send({ b: 2 })
      .expect(409);
    expect(res.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("returns 400 when Idempotency-Key is missing on a required route", async () => {
    const res = await req.post("/api/v1/demo/idempotent").send({ a: 1 }).expect(400);
    expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });
});

describe("P1-06 — Health checks", () => {
  it("/healthz returns 200 (process up)", async () => {
    await req.get("/healthz").expect(200);
  });

  it("/readyz returns 200 when Mongo + Redis are up", async () => {
    const res = await req.get("/readyz").expect(200);
    expect(res.body.data.checks.mongo.status).toBe("up");
    expect(res.body.data.checks.redis.status).toBe("up");
  });
});

describe("P1-17 — GET /config + GET /time", () => {
  it("/api/v1/time returns epoch ms", async () => {
    const res = await req.get("/api/v1/time").set("Authorization", `Bearer ${guestToken}`).expect(200);
    expect(typeof res.body.data.serverTime).toBe("number");
    expect(Math.abs(Date.now() - res.body.data.serverTime)).toBeLessThan(5000);
  });

  it("/api/v1/config returns values from system settings + serverTime", async () => {
    const res = await req.get("/api/v1/config").set("Authorization", `Bearer ${guestToken}`).expect(200);
    const data = res.body.data;
    expect(data.gpsSendIntervalSeconds).toBe(7);
    expect(data.geofenceRadiusMeters).toBe(100);
    expect(data.mapTileSource).toBe("openstreetmap");
    expect(data.vapidPublicKey).toBe("test-vapid");
    expect(data.delayThresholds).toEqual({ onTime: 0, delayed: 5, severe: 15 });
    expect(Math.abs(Date.now() - data.serverTime)).toBeLessThan(5000);
  });
});
