import { Queue } from "bullmq";
import { redisOptions } from "../../../config/redis.js";
import { trackingConfig } from "../config/tracking.config.js";

export const gpsProcessingQueue = new Queue("gps-processing", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const etaCalculationQueue = new Queue("eta-calculation", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const geofenceQueue = new Queue("geofence-processing", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const offlineDetectionQueue = new Queue("offline-detection", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const tripStatsQueue = new Queue("trip-statistics", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const occupancyQueue = new Queue("occupancy-processing", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const eventProcessingQueue = new Queue("event-processing", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const historicalDataQueue = new Queue("historical-data", {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: trackingConfig.queue.maxRetries,
    backoff: {
      type: "exponential",
      delay: trackingConfig.queue.backoffMs,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const trackingQueues = [
  gpsProcessingQueue,
  etaCalculationQueue,
  geofenceQueue,
  offlineDetectionQueue,
  tripStatsQueue,
  occupancyQueue,
  eventProcessingQueue,
  historicalDataQueue,
];

export async function closeTrackingQueues(): Promise<void> {
  await Promise.all(trackingQueues.map((q) => q.close()));
}

/**
 * P2-15 / P2-28 / P2-30 — schedule BullMQ's native repeatable jobs so the
 * offline/stale sweep and GPS-history archival run on a cadence without a
 * separate cron dependency. Safe to call on every worker boot: BullMQ
 * dedupes repeatable jobs by their repeat key.
 */
export async function scheduleRepeatableJobs(): Promise<void> {
  await offlineDetectionQueue.add(
    "sweep",
    {},
    { repeat: { every: 15_000 }, jobId: "offline-sweep-repeat", removeOnComplete: true, removeOnFail: true }
  );

  await historicalDataQueue.add(
    "archive-old-gps",
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: "gps-archive-repeat", removeOnComplete: true, removeOnFail: true }
  );
}