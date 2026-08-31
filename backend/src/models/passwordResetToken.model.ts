import mongoose from "mongoose";

/**
 * Single-use password reset token (email-based). `consumedAt` guards reuse;
 * a TTL index expires stale tokens.
 */
const passwordResetTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passwordResetTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const PasswordResetToken = mongoose.model(
  "PasswordResetToken",
  passwordResetTokenSchema
);
