import mongoose from "mongoose";

/**
 * Stores the response for a given Idempotency-Key + operation so repeat
 * requests replay the original stored response instead of re-executing.
 * The `key` is unique per (org of) operation; a TTL index auto-expires entries.
 */
const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    scope: { type: String, required: true, default: "default" },
    requestHash: { type: String }, // md5 of body+params to detect conflicting reuse
    statusCode: { type: Number, required: true },
    body: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    indexes: [{ key: { key: 1, scope: 1 }, unique: true }],
  }
);

idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const IdempotencyKey = mongoose.model(
  "IdempotencyKey",
  idempotencyKeySchema
);
