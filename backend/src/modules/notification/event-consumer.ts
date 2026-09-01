import { subscribeToEvent, type TrackingEvent, type TrackingEventType } from "../tracking/event-bus.service.js";
import { NotificationChannel } from "./notification.model.js";
import { dispatchNotification } from "./notification.service.js";
import { getSubscriberUserIds } from "../passenger/subscription.service.js";
import { NotificationTemplate } from "./notificationTemplate.model.js";
import { User } from "../user/user.model.js";
import { ROLES } from "../../constants/roles.js";
import logger from "../../utils/logger.js";

/* P1-37 — consume Person 2's real-time events (event bus / P2-23) and fan out to
 * the passengers who follow the affected route/stop, plus operations staff for
 * safety events. Dedup is by (user, eventType:traceId) via the Notification
 * model's unique index. */

const OPS_ROLES = [ROLES.DISPATCHER, ROLES.TRANSPORT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN] as string[];

interface FanOutSpec {
  type: string;
  templateKey: string;
  fallbackTitle: (p: Record<string, unknown>) => string;
  fallbackBody: (p: Record<string, unknown>) => string;
  channels: NotificationChannel[];
  urgent?: boolean;
  audience: "followers" | "ops";
}

const SPECS: Partial<Record<TrackingEventType, FanOutSpec>> = {
  BUS_APPROACHING_STOP: {
    type: "BUS_APPROACHING",
    templateKey: "bus_approaching",
    fallbackTitle: () => "Bus approaching",
    fallbackBody: (p) => `Your bus is about ${Math.round(Number(p.etaArrivalSeconds ?? 0) / 60)} min away.`,
    channels: ["inApp", "webpush"],
    audience: "followers",
  },
  BUS_ARRIVED_STOP: {
    type: "BUS_ARRIVED",
    templateKey: "bus_arrived",
    fallbackTitle: () => "Bus has arrived",
    fallbackBody: () => "Your bus has arrived at the stop.",
    channels: ["inApp", "webpush"],
    audience: "followers",
  },
  VEHICLE_DELAYED: {
    type: "BUS_DELAYED",
    templateKey: "bus_delayed",
    fallbackTitle: () => "Bus delayed",
    fallbackBody: (p) =>
      `A bus on your route is running ${Math.round(Number(p.delaySeconds ?? 0) / 60)} min late.`,
    channels: ["inApp", "webpush"],
    audience: "followers",
  },
  VEHICLE_OFFLINE: {
    type: "VEHICLE_OFFLINE",
    templateKey: "vehicle_offline",
    fallbackTitle: () => "Bus tracking lost",
    fallbackBody: () => "We've lost the live signal for a bus on your route.",
    channels: ["inApp", "webpush"],
    audience: "followers",
  },
  ROUTE_DEVIATION: {
    type: "ROUTE_DEVIATION",
    templateKey: "route_deviation",
    fallbackTitle: () => "Bus off route",
    fallbackBody: () => "A bus on your route has deviated from its planned path.",
    channels: ["inApp", "webpush"],
    audience: "followers",
  },
  DRIVER_SOS: {
    type: "DRIVER_SOS",
    templateKey: "driver_sos",
    fallbackTitle: () => "SOS raised",
    fallbackBody: (p) => `A driver has raised an SOS on vehicle ${String(p.vehicleId ?? "")}.`,
    channels: ["inApp", "webpush", "sms"],
    urgent: true,
    audience: "ops",
  },
};

const resolveContent = async (
  spec: FanOutSpec,
  payload: Record<string, unknown>
): Promise<{ title?: string; body?: string; templateKey?: string; vars?: Record<string, unknown> }> => {
  const tpl = await NotificationTemplate.findOne({ key: spec.templateKey, enabled: true }).lean();
  if (tpl) return { templateKey: spec.templateKey, vars: payload };
  return { title: spec.fallbackTitle(payload), body: spec.fallbackBody(payload) };
};

const targetUserIds = async (spec: FanOutSpec, payload: Record<string, unknown>): Promise<string[]> => {
  if (spec.audience === "ops") {
    const staff = await User.find({ role: { $in: OPS_ROLES }, isActive: true, deletedAt: null })
      .select("_id")
      .lean();
    return staff.map((u) => u._id.toString());
  }
  const ids = new Set<string>();
  if (typeof payload.routeId === "string" && payload.routeId) {
    for (const uid of await getSubscriberUserIds("route", payload.routeId)) ids.add(uid);
  }
  if (typeof payload.stopId === "string" && payload.stopId) {
    for (const uid of await getSubscriberUserIds("stop", payload.stopId)) ids.add(uid);
  }
  return [...ids];
};

/** Exported so it can be unit-tested without going through Redis pub/sub. */
export const handleTrackingEvent = async (event: TrackingEvent): Promise<{ notified: number }> => {
  const spec = SPECS[event.eventType];
  if (!spec) return { notified: 0 };

  const payload = event.payload ?? {};
  const users = await targetUserIds(spec, payload);
  if (!users.length) return { notified: 0 };

  const content = await resolveContent(spec, payload);
  let notified = 0;
  for (const userId of users) {
    try {
      const r = await dispatchNotification({
        userId,
        type: spec.type,
        channels: spec.channels,
        urgent: spec.urgent,
        data: { event: spec.type, ...payload },
        dedupeKey: `${event.eventType}:${event.traceId}`,
        ...content,
      });
      if (r.status !== "duplicate") notified++;
    } catch (err) {
      logger.warn(`fan-out to ${userId} for ${event.eventType} failed: ${(err as Error).message}`);
    }
  }
  logger.info(`Notification fan-out: ${event.eventType} → ${notified}/${users.length} users`, {
    traceId: event.traceId,
  });
  return { notified };
};

let unsubscribers: Array<() => void> = [];

export const startNotificationConsumer = (): void => {
  if (unsubscribers.length) return;
  for (const eventType of Object.keys(SPECS) as TrackingEventType[]) {
    unsubscribers.push(
      subscribeToEvent(eventType, async (e) => {
        await handleTrackingEvent(e).catch(() => undefined);
      })
    );
  }
  logger.info(`Notification event consumer started (${unsubscribers.length} event types)`);
};

export const stopNotificationConsumer = (): void => {
  for (const u of unsubscribers) u();
  unsubscribers = [];
  logger.info("Notification event consumer stopped");
};
