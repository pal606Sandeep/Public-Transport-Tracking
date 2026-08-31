import { Types } from "mongoose";
import { Subscription, SubscriptionType } from "./subscription.model.js";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { AppError } from "../../utils/AppError.js";

/* P1-35 — favourite subscriptions. Feeds the Notification Service (P1-37) for
 * BUS_DELAYED / ROUTE_DEVIATION / trip:cancelled and service alerts on the
 * routes/stops a passenger follows. */

export const listSubscriptions = async (userId: string): Promise<unknown[]> => {
  const docs = await Subscription.find({ userId }).sort({ createdAt: -1 }).lean();
  return docs.map(serialize);
};

export const addSubscription = async (
  userId: string,
  type: SubscriptionType,
  targetId: string
): Promise<{ subscription: unknown; created: boolean }> => {
  const exists =
    type === "route"
      ? await Route.exists({ _id: targetId, deletedAt: null })
      : await Stop.exists({ _id: targetId, deletedAt: null });
  if (!exists) throw AppError.notFound(`${type} not found`, "TARGET_NOT_FOUND");

  const filter = { userId: new Types.ObjectId(userId), type, targetId: new Types.ObjectId(targetId) };
  const existing = await Subscription.findOne(filter).lean();
  if (existing) return { subscription: serialize(existing), created: false };

  try {
    const doc = await Subscription.create(filter);
    return { subscription: serialize(doc.toObject()), created: true };
  } catch (err) {
    // Unique-index race: another request created the same subscription.
    if ((err as { code?: number }).code === 11000) {
      const again = await Subscription.findOne(filter).lean();
      return { subscription: serialize(again!), created: false };
    }
    throw err;
  }
};

export const removeSubscription = async (userId: string, id: string): Promise<void> => {
  const res = await Subscription.deleteOne({ _id: id, userId });
  if (res.deletedCount === 0)
    throw AppError.notFound("Subscription not found", "SUBSCRIPTION_NOT_FOUND");
};

/** Used by the Notification Service to resolve who follows a route/stop. */
export const getSubscriberUserIds = async (
  type: SubscriptionType,
  targetId: string
): Promise<string[]> => {
  const docs = await Subscription.find({ type, targetId }).select("userId").lean();
  return docs.map((d) => d.userId.toString());
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serialize = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  type: d.type,
  targetId: d.targetId?.toString?.() ?? d.targetId,
  createdAt: d.createdAt,
});
