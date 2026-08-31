import { Router, Request, Response } from "express";
import api from "./spec.js";
import { apiResponse } from "../utils/apiResponse.js";

/**
 * Lightweight structural validation of the OpenAPI document.
 * Verifies the essential 3.1 invariants so CI can lint it.
 */
export const validateSpec = (): string[] => {
  const errors: string[] = [];
  if (api.openapi !== "3.1.0") errors.push("openapi version must be 3.1.0");
  if (!api.info?.title || !api.info?.version) errors.push("info.title/version required");
  if (!api.paths || Object.keys(api.paths).length === 0) errors.push("paths required");

  for (const [path, item] of Object.entries(api.paths ?? {})) {
    if (!path.startsWith("/")) errors.push(`path must start with '/': ${path}`);
    if (!item) continue;
    for (const method of Object.keys(item)) {
      const op = (item as Record<string, unknown>)[method];
      if (typeof op === "object" && op && !("responses" in (op as object))) {
        errors.push(`operation ${method.toUpperCase()} ${path} missing responses`);
      }
    }
  }
  return errors;
};

const exampleBody = (status: number): Record<string, unknown> => {
  if (status >= 400) {
    return { error: { code: "MOCK_ERROR", message: "Example error (mock)", traceId: "mock" } };
  }
  return { success: true, message: "Mock response", data: { mock: true } };
};

const MOCK = {
  get: 200,
  post: 201,
  put: 200,
  patch: 200,
  delete: 200,
};

/**
 * Mock server: for every path/operation in the spec, respond with an example
 * success/error envelope. Lets the frontend develop against stable contracts.
 */
export const buildMockServer = (): Router => {
  const router = Router();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rr = router as any;

  for (const [path, item] of Object.entries(api.paths ?? {})) {
    if (!item) continue;
    for (const [method, op] of Object.entries(item as Record<string, Record<string, unknown>>)) {
      if (!(method in MOCK)) continue;
      const responses = (op.responses as Record<string, unknown>) || {};
      const successKey = Object.keys(responses)
        .map(Number)
        .filter((s) => s >= 200 && s < 400)
        .sort((a, b) => a - b)[0];

      const routePath = path.replace(/\{(.*?)\}/g, ":$1");

      rr[method](routePath, (req: Request, res: Response) => {
        const status = successKey || MOCK[method as keyof typeof MOCK];
        res.status(status).json(exampleBody(status));
      });
    }
  }

  return router;
};

export const specRouter = (): Router => {
  const router = Router();

  router.get("/openapi.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.json(api);
  });

  router.get("/openapi.yaml", (req: Request, res: Response) => {
    apiResponse(res, 501, false, "YAML serialization not implemented (see openapi.json)");
  });

  router.use("/mock", buildMockServer());

  return router;
};
