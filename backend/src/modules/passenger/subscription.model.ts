import mongoose, { Types } from "mongoose";

export type SubscriptionType = "route" | "stop";

export interface ISubscription {
  userId: Types.ObjectId;
  type: SubscriptionType;
  targetId: Types.ObjectId;
}

const subscriptionSchema = new mongoose.Schema<ISubscription>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["route", "stop"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// One subscription per (user, type, target) — the dedup guarantee.
subscriptionSchema.index({ userId: 1, type: 1, targetId: 1 }, { unique: true });
subscriptionSchema.index({ type: 1, targetId: 1 });

export const Subscription = mongoose.model<ISubscription>("Subscription", subscriptionSchema);
