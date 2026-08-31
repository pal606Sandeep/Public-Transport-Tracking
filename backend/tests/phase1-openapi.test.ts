import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown } from "./support.js";
import { validateSpec } from "../src/openapi/index.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-18 — OpenAPI 3.1 spec + mock server", () => {
  it("spec is structurally valid (3.1.0, paths, responses)", () => {
    const errors = validateSpec();
    expect(errors).toEqual([]);
  });

  it("serves the OpenAPI document at /api-docs/openapi.json", async () => {
    const res = await req.get("/api-docs/openapi.json").expect(200);
    expect(res.body.openapi).toBe("3.1.0");
    expect(res.body.paths).toBeDefined();
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(5);
  });

  it("mock server serves example responses for defined paths", async () => {
    // GET example (success envelope)
    const getRes = await req.get("/api-docs/mock/healthz").expect(200);
    expect(getRes.body.success).toBe(true);

    // POST example (spec declares 200 for /auth/login)
    const postRes = await req.post("/api-docs/mock/auth/login").expect(200);
    expect(postRes.body.success).toBe(true);
  });
});
