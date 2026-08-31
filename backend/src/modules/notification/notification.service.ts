import { Types } from "mongoose";
import { Notification, NotificationChannel } from "./notification.model.js";
import { NotificationPreference } from "./notificationPreference.model.js";
import { NotificationTemplate } from "./notificationTemplate.model.js";
import { PushSubscription } from "./pushSubscription.model.js";
import { User } from "../user/user.model.js";
import { deliverWebPush, deliverSms, deliverEmail } from "./channels.js";
import { AppError } from "../../utils/AppError.js";
import logger from "../../utils/logger.js";

const EXTERNAL_CHANNELS: NotificationChannel[] = ["webpush", "sms", "email"];

/* --------------------------------------------------------------------- *
 * templates
 * --------------------------------------------------------------------- */

/** Replace `{{var}}` / `{{ var }}` tokens; unknown vars render as empty string. */
export const renderString = (tpl: string, vars: Record<string, unknown>): string =>
  tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });

export const renderTemplate = async (
  key: string,
  vars: Record<string, unknown>
): Promise<{ title: string; body: string }> => {
  const tpl = await NotificationTemplate.findOne({ key }).lean();
  if (!tpl) throw AppError.notFound(`Notification template '${key}' not found`, "TEMPLATE_NOT_FOUND");
  if (!tpl.enabled) throw AppError.conflict(`Template '${key}' is disabled`, "TEMPLATE_DISABLED");
  return {
    title: renderString(tpl.titleTemplate, vars),
    body: renderString(tpl.bodyTemplate, vars),
  };
};

export const listTemplates = async (): Promise<unknown[]> => {
  const docs = await NotificationTemplate.find().sort({ key: 1 }).lean();
  return docs.map(serializeTemplate);
};

export const upsertTemplate = async (input: {
  key: string;
  description?: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  variables?: string[];
  enabled?: boolean;
}): Promise<unknown> => {
  const doc = await NotificationTemplate.findOneAndUpdate(
    { key: input.key },
    {
      $set: {
        description: input.description ?? null,
        titleTemplate: input.titleTemplate,
        bodyTemplate: input.bodyTemplate,
        variables: input.variables ?? [],
        enabled: input.enabled ?? true,
      },
    },
    { new: true, upsert: true }
  ).lean();
  return serializeTemplate(doc!);
};

export const deleteTemplate = async (key: string): Promise<void> => {
  const res = await NotificationTemplate.deleteOne({ key });
  if (res.deletedCount === 0) throw AppError.notFound("Template not found", "TEMPLATE_NOT_FOUND");
};

/* --------------------------------------------------------------------- *
 * preferences + quiet hours
 * --------------------------------------------------------------------- */

export const getOrCreatePreferences = async (userId: string): Promise<unknown> => {
  const doc = await getPrefDoc(userId);
  return serializePreferences(doc);
};

export const updatePreferences = async (
  userId: string,
  patch: {
    channels?: Partial<{ inApp: boolean; webpush: boolean; sms: boolean; email: boolean }>;
    quietHours?: { start: string | null; end: string | null };
    digest?: boolean;
    mutedTypes?: string[];
  }
): Promise<unknown> => {
  const doc = await getPrefDoc(userId);
  if (patch.channels) {
    for (const k of ["inApp", "webpush", "sms", "email"] as const) {
      if (patch.channels[k] !== undefined) doc.channels[k] = patch.channels[k]!;
    }
  }
  if (patch.quietHours !== undefined) {
    doc.quietHours.start = patch.quietHours.start;
    doc.quietHours.end = patch.quietHours.end;
  }
  if (patch.digest !== undefined) doc.digest = patch.digest;
  if (patch.mutedTypes !== undefined) doc.mutedTypes = patch.mutedTypes;
  await doc.save();
  return serializePreferences(doc);
};

const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** Is `now` inside the [start, end) quiet window? Handles windows that wrap midnight. */
export const isWithinQuietHours = (
  quietHours: { start: string | null; end: string | null },
  now: Date = new Date()
): boolean => {
  if (!quietHours.start || !quietHours.end) return false;
  const s = toMinutes(quietHours.start);
  const e = toMinutes(quietHours.end);
  if (s === null || e === null || s === e) return false;
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
};

/** Next Date at which the quiet window ends, relative to `now`. */
const quietHoursEndAt = (
  quietHours: { start: string | null; end: string | null },
  now: Date
): Date | null => {
  const e = quietHours.end ? toMinutes(quietHours.end) : null;
  if (e === null) return null;
  const end = new Date(now);
  end.setUTCHours(Math.floor(e / 60), e % 60, 0, 0);
  if (end.getTime() <= now.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return end;
};

/* --------------------------------------------------------------------- *
 * dispatch
 * --------------------------------------------------------------------- */

export interface DispatchInput {
  userId: string;
  type: string;
  title?: string;
  body?: string;
  templateKey?: string;
  vars?: Record<string, unknown>;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  /** Urgent notifications ignore quiet hours (e.g. DRIVER_SOS). */
  urgent?: boolean;
  /** When set, a repeat dispatch with the same key for the same user is a no-op. */
  dedupeKey?: string;
}

export interface DispatchResult {
  notificationId: string | null;
  status: "sent" | "deferred" | "duplicate";
  channels: NotificationChannel[];
  deferredUntil?: Date | null;
  pushPruned?: number;
}

export const dispatchNotification = async (input: DispatchInput): Promise<DispatchResult> => {
  let { title, body } = input;
  if (input.templateKey) {
    const rendered = await renderTemplate(input.templateKey, input.vars ?? {});
    title = rendered.title;
    body = rendered.body;
  }
  if (!title || !body) throw AppError.badRequest("title and body (or a template) are required", "MISSING_CONTENT");

  const prefs = await getPrefDoc(input.userId);
  if (prefs.mutedTypes.includes(input.type)) {
    return { notificationId: null, status: "duplicate", channels: [] };
  }

  const requested = input.channels?.length ? input.channels : (["inApp", "webpush"] as NotificationChannel[]);
  const enabled = requested.filter((ch) => prefs.channels[ch]);
  if (!enabled.includes("inApp") && prefs.channels.inApp) enabled.unshift("inApp");

  const now = new Date();
  const quiet = !input.urgent && isWithinQuietHours(prefs.quietHours, now);
  const deferredUntil = quiet ? quietHoursEndAt(prefs.quietHours, now) : null;

  // In-app record is always stored (history); status reflects deferral.
  let notif;
  try {
    notif = await Notification.create({
      user: new Types.ObjectId(input.userId),
      type: input.type,
      title,
      body,
      data: input.data ?? null,
      channels: enabled,
      status: quiet ? "deferred" : "sent",
      deferredUntil,
      dedupeKey: input.dedupeKey ?? null,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return { notificationId: null, status: "duplicate", channels: [] };
    }
    throw err;
  }

  let pushPruned = 0;
  if (!quiet) {
    // Fan out to external channels immediately. Deferred notifications wait for
    // the digest/quiet-hours flush and are not pushed now.
    const user = await User.findById(input.userId).lean();
    for (const ch of EXTERNAL_CHANNELS) {
      if (!enabled.includes(ch)) continue;
      try {
        if (ch === "webpush") {
          const r = await deliverWebPush(input.userId, { title, body, data: input.data });
          pushPruned += r.pruned;
        } else if (ch === "sms" && user?.phone) {
          await deliverSms(user.phone, { title, body });
        } else if (ch === "email" && user?.email) {
          await deliverEmail(user.email, { title, body });
        }
      } catch (err) {
        logger.warn(`notification channel ${ch} failed for user ${input.userId}: ${(err as Error).message}`);
      }
    }
  }

  return {
    notificationId: notif._id.toString(),
    status: quiet ? "deferred" : "sent",
    channels: enabled,
    deferredUntil,
    pushPruned,
  };
};

/**
 * Re-send notifications whose quiet-hours deferral has elapsed. Marks them
 * `sent` and pushes them out. Returns how many were flushed.
 */
export const flushDeferred = async (asOf: Date = new Date()): Promise<number> => {
  const due = await Notification.find({
    status: "deferred",
    deferredUntil: { $ne: null, $lte: asOf },
  }).lean();
  for (const n of due) {
    await Notification.updateOne({ _id: n._id }, { $set: { status: "sent", deferredUntil: null } });
    if (n.channels?.includes("webpush")) {
      await deliverWebPush(n.user.toString(), { title: n.title, body: n.body, data: n.data }).catch(() => undefined);
    }
  }
  return due.length;
};

/* --------------------------------------------------------------------- *
 * history / read state
 * --------------------------------------------------------------------- */

export const listNotifications = async (
  userId: string,
  opts: { page: number; limit: number; unreadOnly?: boolean }
): Promise<unknown> => {
  const filter: Record<string, unknown> = { user: userId };
  if (opts.unreadOnly) filter.read = false;
  const total = await Notification.countDocuments(filter);
  const unread = await Notification.countDocuments({ user: userId, read: false });
  const docs = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((opts.page - 1) * opts.limit)
    .limit(opts.limit)
    .lean();
  return {
    notifications: docs.map(serializeNotification),
    unread,
    pagination: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
    },
  };
};

export const getNotification = async (userId: string, id: string): Promise<unknown> => {
  const doc = await Notification.findOne({ _id: id, user: userId }).lean();
  if (!doc) throw AppError.notFound("Notification not found", "NOTIFICATION_NOT_FOUND");
  return serializeNotification(doc);
};

export const setRead = async (userId: string, id: string, read: boolean): Promise<unknown> => {
  const doc = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: { read, readAt: read ? new Date() : null } },
    { new: true }
  ).lean();
  if (!doc) throw AppError.notFound("Notification not found", "NOTIFICATION_NOT_FOUND");
  return serializeNotification(doc);
};

export const markAllRead = async (userId: string): Promise<{ updated: number }> => {
  const res = await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  return { updated: res.modifiedCount };
};

/* --------------------------------------------------------------------- *
 * web push subscriptions
 * --------------------------------------------------------------------- */

export const registerPushSubscription = async (
  userId: string,
  input: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
): Promise<unknown> => {
  const doc = await PushSubscription.findOneAndUpdate(
    { endpoint: input.endpoint },
    {
      $set: {
        user: new Types.ObjectId(userId),
        keys: input.keys,
        userAgent: input.userAgent ?? null,
        lastFailureAt: null,
      },
    },
    { new: true, upsert: true }
  ).lean();
  return { _id: doc!._id.toString(), endpoint: doc!.endpoint };
};

export const removePushSubscription = async (userId: string, endpoint: string): Promise<void> => {
  const res = await PushSubscription.deleteOne({ endpoint, user: userId });
  if (res.deletedCount === 0)
    throw AppError.notFound("Push subscription not found", "PUSH_SUBSCRIPTION_NOT_FOUND");
};

/* --------------------------------------------------------------------- *
 * serializers
 * --------------------------------------------------------------------- */

const getPrefDoc = async (userId: string) => {
  let doc = await NotificationPreference.findOne({ user: userId });
  if (!doc) doc = await NotificationPreference.create({ user: new Types.ObjectId(userId) });
  return doc;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeNotification = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  type: d.type,
  title: d.title,
  body: d.body,
  data: d.data ?? null,
  channels: d.channels ?? [],
  status: d.status ?? "sent",
  read: d.read ?? false,
  readAt: d.readAt ?? null,
  deferredUntil: d.deferredUntil ?? null,
  createdAt: d.createdAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializePreferences = (d: any): Record<string, unknown> => ({
  channels: d.channels,
  quietHours: d.quietHours ?? { start: null, end: null },
  digest: d.digest ?? false,
  mutedTypes: d.mutedTypes ?? [],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeTemplate = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  key: d.key,
  description: d.description ?? null,
  titleTemplate: d.titleTemplate,
  bodyTemplate: d.bodyTemplate,
  variables: d.variables ?? [],
  enabled: d.enabled ?? true,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
