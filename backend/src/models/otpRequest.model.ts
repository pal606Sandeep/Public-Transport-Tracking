import mongoose from "mongoose";

/**
 * One-time password request + abuse tracking. Records attempt counts, lockout
 * windows, and resend cooldowns, keyed by phone number and optionally IP.
 */
const otpRequestSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    ipHash: { type: String, default: null, index: true },
    otpHash: { type: String }, // hashed OTP (never store plaintext)
    purpose: { type: String, default: "login" },
    expiresAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

otpRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 15 });

export const OtpRequest = mongoose.model("OtpRequest", otpRequestSchema);
