import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { randomUUID } from "crypto";

const envelope = (code: string, message: string) => ({
  error: { code, message, traceId: randomUUID() },
});

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * Global API limiter. Window/limit are env-tunable (RATE_LIMIT_WINDOW_MS,
 * RATE_LIMIT_MAX). Outside production, loopback traffic is exempt so local
 * dev (multiple apps + the GPS simulator on 127.0.0.1) doesn't hit 429s.
 */
export const limiter = rateLimit({
  windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  limit: num(process.env.RATE_LIMIT_MAX, 200),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    process.env.NODE_ENV !== "production" && LOOPBACK.has(req.ip ?? ""),
  message: envelope("RATE_LIMITED", "Too many requests, please try again later."),
});

/** Stricter limiter for OTP request/verify (abuse protection). */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: envelope("OTP_RATE_LIMITED", "Too many OTP attempts. Try again later."),
});

/**
 * P2-26 — per-device/vehicle limiter on GPS ingestion so a single
 * misbehaving or compromised device can't flood the tracking pipeline.
 * Keyed by the reporting vehicle (falls back to IP for unauthenticated /
 * malformed requests, which validation rejects anyway).
 */
export const trackingIngestionLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const vehicleId = (req.body as { vehicleId?: string } | undefined)?.vehicleId;
    return vehicleId ? `veh:${vehicleId}` : ipKeyGenerator(req.ip ?? "unknown");
  },
  message: envelope("TRACKING_RATE_LIMITED", "Too many location updates from this vehicle."),
});
