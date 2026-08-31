import mongoose, { Types } from "mongoose";

export interface IPushSubscription {
  user: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string | null;
  lastFailureAt?: Date | null;
}

const pushSubscriptionSchema = new mongoose.Schema<IPushSubscription>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: null },
    lastFailureAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ user: 1 });

export const PushSubscription = mongoose.model<IPushSubscription>(
  "PushSubscription",
  pushSubscriptionSchema
);
