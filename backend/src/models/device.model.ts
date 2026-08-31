import mongoose from "mongoose";

/**
 * Browsed device / Web-Push subscription for a user.
 * `pushSubscription` is null until the user grants push permission, then patched.
 * DRIVER/CONDUCTOR are limited to one ACTIVE device; a second registration is
 * held PENDING for admin approval.
 */
const deviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceId: { type: String, required: true },
    name: { type: String, default: "Unknown device" },
    platform: { type: String, default: "web" },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "REVOKED"],
      default: "ACTIVE",
    },
    pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const Device = mongoose.model("Device", deviceSchema);
