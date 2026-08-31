import { PushSubscription } from "./pushSubscription.model.js";
import logger from "../../utils/logger.js";

/**
 * Channel transport seam. Real Web Push / SMS / email transports (web-push,
 * an SMS gateway, an SMTP client) are not wired yet, so each external channel
 * has a pluggable sender that defaults to a no-op. Tests (and later the real
 * integrations) install a sender via `setChannelSender`.
 *
 * A webpush sender should throw an error carrying `statusCode` 404 or 410 for a
 * dead endpoint — the dispatcher prunes the subscription when it sees that.
 */

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type WebPushSender = (target: PushTarget, payload: string) => Promise<void>;
export type SimpleSender = (to: string, payload: { title: string; body: string }) => Promise<void>;

const noopWebPush: WebPushSender = async () => undefined;
const noopSimple: SimpleSender = async () => undefined;

let webPushSender: WebPushSender = noopWebPush;
let smsSender: SimpleSender = noopSimple;
let emailSender: SimpleSender = noopSimple;

export const setChannelSender = (
  channel: "webpush" | "sms" | "email",
  sender: WebPushSender | SimpleSender
): void => {
  if (channel === "webpush") webPushSender = sender as WebPushSender;
  else if (channel === "sms") smsSender = sender as SimpleSender;
  else emailSender = sender as SimpleSender;
};

export const resetChannelSenders = (): void => {
  webPushSender = noopWebPush;
  smsSender = noopSimple;
  emailSender = noopSimple;
};

/**
 * Deliver a Web Push payload to every registered subscription for a user.
 * Returns the number of subscriptions pruned because the push service reported
 * the endpoint gone (HTTP 404 / 410).
 */
export const deliverWebPush = async (
  userId: string,
  payload: { title: string; body: string; data?: unknown }
): Promise<{ delivered: number; pruned: number }> => {
  const subs = await PushSubscription.find({ user: userId }).lean();
  let delivered = 0;
  let pruned = 0;
  const body = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webPushSender({ endpoint: sub.endpoint, keys: sub.keys }, body);
      delivered++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
        pruned++;
        logger.info(`Pruned expired push subscription ${sub._id} (HTTP ${code})`);
      } else {
        logger.warn(`Web push send failed for ${sub._id}: ${(err as Error).message}`);
        await PushSubscription.updateOne({ _id: sub._id }, { $set: { lastFailureAt: new Date() } });
      }
    }
  }
  return { delivered, pruned };
};

export const deliverSms = async (
  to: string,
  payload: { title: string; body: string }
): Promise<void> => {
  await smsSender(to, payload);
};

export const deliverEmail = async (
  to: string,
  payload: { title: string; body: string }
): Promise<void> => {
  await emailSender(to, payload);
};
