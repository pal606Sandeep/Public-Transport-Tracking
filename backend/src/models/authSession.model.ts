import mongoose from "mongoose";

/**
 * Refresh-token session record. Enables refresh-token rotation + reuse
 * detection, device/session listing, and revocation.
 */
const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    deviceId: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: null }, // ROTATED | LOGOUT | REVOKE | REUSE
    lastUsedAt: { type: Date, default: Date.now },
    // rotation: the token family id so a reused (old) token can revoke the whole family
    familyId: { type: String, default: null },
  },
  { timestamps: true }
);

export const AuthSession = mongoose.model("AuthSession", authSessionSchema);
