import redisClient from "../../config/redis.js";
import logger from "../../utils/logger.js";
import { randomUUID } from "crypto";

export type TrackingEventType =
  | "BUS_APPROACHING_STOP"
  | "BUS_ARRIVED_STOP"
  | "BUS_LEFT_STOP"
  | "VEHICLE_DELAYED"
  | "VEHICLE_OFFLINE"
  | "ROUTE_DEVIATION"
  | "DRIVER_SOS"
  | "GPS_FAILURE"
  | "TRIP_STATS_READY"
  | "OCCUPANCY_CHANGED";

export interface TrackingEvent {
  eventType: TrackingEventType;
  payload: Record<string, unknown>;
  traceId: string;
  timestamp: number;
  publishedAt?: number;
}

const CHANNEL_PREFIX = "tracking:events:";

function generateTraceId(): string {
  return `trk_${Date.now()}_${randomUUID().split("-")[0]}`;
}

const publishToChannel = async (
  eventType: TrackingEventType,
  payload: Record<string, unknown>,
  id: string
): Promise<void> => {
  const event: TrackingEvent = {
    eventType,
    payload,
    traceId: id,
    timestamp: Date.now(),
    publishedAt: Date.now(),
  };

  const channel = `${CHANNEL_PREFIX}${eventType}`;

  try {
    await redisClient.publish(channel, JSON.stringify(event));
    await redisClient.publish("tracking:events:all", JSON.stringify(event));
    logger.info(`Event published: ${eventType}`, { traceId: id, eventType });
  } catch (err) {
    logger.error(`Failed to publish event ${eventType}: ${(err as Error).message}`, { traceId: id });
  }
};

/**
 * P2-23 — publishes now (Pub/Sub, fast path, no delivery guarantee) and also
 * enqueues a durable BullMQ job as an at-least-once backstop: if a
 * subscriber is down when this fires, the "event-processing" worker
 * re-publishes on its own retry/backoff schedule after reconnecting.
 * Consumers dedupe on `traceId`.
 */
export const publishEvent = async (
  eventType: TrackingEventType,
  payload: Record<string, unknown>,
  traceId?: string
): Promise<string> => {
  const id = traceId || generateTraceId();

  await publishToChannel(eventType, payload, id);

  try {
    const { eventProcessingQueue } = await import("./queues/tracking.queues.js");
    await eventProcessingQueue.add(
      "redeliver",
      { eventType, payload, traceId: id },
      { jobId: `redeliver-${id}`, delay: 5000 }
    );
  } catch (err) {
    logger.error(`Failed to enqueue durable redelivery for ${eventType}: ${(err as Error).message}`, { traceId: id });
  }

  return id;
};

/** Used by the event-processing worker to redeliver without re-enqueuing itself. */
export const republishEvent = async (
  eventType: TrackingEventType,
  payload: Record<string, unknown>,
  traceId: string
): Promise<void> => {
  await publishToChannel(eventType, payload, traceId);
};

export const subscribeToEvent = (
  eventType: TrackingEventType | "all",
  handler: (event: TrackingEvent) => void | Promise<void>
): (() => void) => {
  const channel = eventType === "all" ? "tracking:events:all" : `${CHANNEL_PREFIX}${eventType}`;
  const subscriber = redisClient.duplicate();

  subscriber.subscribe(channel, (err) => {
    if (err) {
      logger.error(`Failed to subscribe to ${channel}: ${err.message}`);
    }
  });

  subscriber.on("message", async (_ch: string, message: string) => {
    try {
      const event: TrackingEvent = JSON.parse(message);
      await handler(event);
    } catch (err) {
      logger.error(`Error handling event on ${channel}: ${(err as Error).message}`);
    }
  });

  return () => {
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
};

export const EVENT_PAYLOADS = {
  BUS_APPROACHING_STOP: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    stopId: "",
    distanceToStopMeters: 0,
    etaArrivalSeconds: 0,
    timestamp: 0,
  },
  BUS_ARRIVED_STOP: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    stopId: "",
    sequence: 0,
    arrivalTime: 0,
    scheduledTime: 0,
    delaySeconds: 0,
    lat: 0,
    lng: 0,
    timestamp: 0,
  },
  BUS_LEFT_STOP: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    stopId: "",
    sequence: 0,
    departureTime: 0,
    dwellTimeSeconds: 0,
    timestamp: 0,
  },
  VEHICLE_DELAYED: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    delayStatus: "",
    delaySeconds: 0,
    scheduledArrival: 0,
    predictedArrival: 0,
    nextStopId: "",
    timestamp: 0,
  },
  VEHICLE_OFFLINE: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    driverId: "",
    lastSeenTimestamp: 0,
    offlineSince: 0,
    reason: "",
    lastKnownLocation: { lat: 0, lng: 0 },
    timestamp: 0,
  },
  ROUTE_DEVIATION: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    deviationDistanceMeters: 0,
    thresholdMeters: 0,
    durationAboveThresholdSeconds: 0,
    vehicleLocation: { lat: 0, lng: 0 },
    nearestPointOnRoute: { lat: 0, lng: 0 },
    timestamp: 0,
  },
  DRIVER_SOS: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    driverId: "",
    location: { lat: 0, lng: 0 },
    timestamp: 0,
  },
  GPS_FAILURE: {
    vehicleId: "",
    tripId: "",
    driverId: "",
    reason: "",
    details: "",
    lastValidLocation: { lat: 0, lng: 0 },
    timestamp: 0,
  },
  TRIP_STATS_READY: {
    tripId: "",
    vehicleId: "",
    routeId: "",
    driverId: "",
    totalDistanceMeters: 0,
    movingTimeSeconds: 0,
    idleTimeSeconds: 0,
    stopsServed: 0,
    perStopActualVsScheduled: [] as Array<{
      stopId: string;
      sequence: number;
      scheduledArrival: number;
      actualArrival: number;
      delaySeconds: number;
    }>,
    onTimePercentage: 0,
    overallDelaySeconds: 0,
    averageSpeedKmh: 0,
    maxSpeedKmh: 0,
    tripStartedAt: 0,
    tripEndedAt: 0,
    timestamp: 0,
  },
  OCCUPANCY_CHANGED: {
    vehicleId: "",
    tripId: "",
    routeId: "",
    previousLevel: "",
    currentLevel: "",
    passengerCount: 0,
    capacity: 0,
    occupancyPercentage: 0,
    timestamp: 0,
  },
} as const;
