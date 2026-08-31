import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { randomUUID } from "crypto";

const envelope = (code: string, message: string) => ({
  error: { code, message, traceId: randomUUID() },
});

/** Global API limiter. */
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
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
