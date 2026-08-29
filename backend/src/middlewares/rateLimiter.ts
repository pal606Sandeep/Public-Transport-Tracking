import rateLimit from "express-rate-limit";
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
