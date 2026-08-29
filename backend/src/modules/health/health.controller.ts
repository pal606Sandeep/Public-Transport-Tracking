import mongoose from "mongoose";
import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";

/** GET /healthz — process is up. */
export const healthz = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  apiResponse(res, 200, true, "OK", { status: "ok" });
});

/** GET /readyz — Mongo + Redis reachable. */
export const readyz = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const checks: Record<string, { status: "up" | "down"; detail?: string }> = {};

  const mongoState = mongoose.connection.readyState;
  checks.mongo = { status: mongoState === 1 ? "up" : "down" };
  if (mongoState !== 1) {
    checks.mongo.detail = "MongoDB not connected (readyState !== 1)";
  }

  let redisUp = false;
  try {
    const { default: redisClient } = await import("../../config/redis.js");
    if (redisClient.status === "ready") {
      redisUp = true;
    } else {
      const pong = await Promise.race([
        redisClient.ping(),
        new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 1500)),
      ]);
      redisUp = pong === "PONG";
    }
  } catch {
    redisUp = false;
  }
  checks.redis = redisUp ? { status: "up" } : { status: "down", detail: "Redis ping failed" };

  const allUp = checks.mongo.status === "up" && checks.redis.status === "up";
  apiResponse(res, allUp ? 200 : 503, allUp, allUp ? "Ready" : "Not ready", { checks });
});
