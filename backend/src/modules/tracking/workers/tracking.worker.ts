import { Worker } from "bullmq";
import { redisOptions } from "../../../config/redis.js";
import { connectDB } from "../../../config/db.js";
import logger from "../../../utils/logger.js";
import { trackingConfig } from "../config/tracking.config.js";
import {
  gpsProcessingQueue,
  etaCalculationQueue,
  geofenceQueue,
  offlineDetectionQueue,
  tripStatsQueue,
  occupancyQueue,
  eventProcessingQueue,
  historicalDataQueue,
  scheduleRepeatableJobs,
} from "../queues/tracking.queues.js";
import { validateGPSSchema, updateVehicleLocation, type GPSSchema } from "../tracking.service.js";
import { detectGPSAnomaly } from "../anomaly/gps-anomaly.service.js";
import { calculateETA } from "../geo/eta.service.js";
import { processGeofence } from "../geo/geofence-processing.service.js";
import { sweepOfflineVehicles } from "../geo/offline-detection.service.js";
import { sweepIdleDrivers } from "../geo/driver-status.service.js";
import { computeTripStatistics } from "../geo/trip-stats.service.js";
import { processOccupancyUpdate } from "../geo/occupancy.service.js";
import { persistGPSPointDirect, archiveOldGPSHistory, type GPSPoint } from "../geo/gps-history.service.js";
import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import { republishEvent, type TrackingEventType } from "../event-bus.service.js";

const connection = redisOptions;

interface OccupancyJob {
  vehicleId: string;
  tripId: string;
  routeId: string;
  passengerCount: number;
  capacity: number;
}

interface EventProcessingJob {
  eventType: TrackingEventType;
  payload: Record<string, unknown>;
  traceId: string;
}

const workers: Worker[] = [];

function createGPSProcessingWorker(): Worker<GPSSchema> {
  const worker = new Worker<GPSSchema>(
    "gps-processing",
    async (job) => {
      const data = job.data;
      const anomaly = detectGPSAnomaly(data.vehicleId, data.latitude, data.longitude, data.speed, data.timestamp, data.accuracy);
      if (anomaly.isAnomaly) {
        logger.warn(`[GPS Processing] Anomaly for vehicle ${data.vehicleId}: ${anomaly.reason}`);
        return { success: false, vehicleId: data.vehicleId, reason: anomaly.reason };
      }
      await validateGPSSchema(data);
      await updateVehicleLocation(data);
      return { success: true, vehicleId: data.vehicleId, tripId: data.tripId };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[GPS Processing] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[GPS Processing] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createETACalculationWorker(): Worker<{ vehicleId: string; tripId: string; routeId: string; lat: number; lng: number; speed: number }> {
  const worker = new Worker(
    "eta-calculation",
    async (job) => {
      const { vehicleId, tripId, routeId, lat, lng, speed } = job.data;
      const eta = await calculateETA(vehicleId, tripId, routeId, lat, lng, speed);
      return { success: true, vehicleId, tripId, eta };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[ETA Calculation] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[ETA Calculation] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createGeofenceWorker(): Worker<{ vehicleId: string; tripId: string; routeId: string; lat: number; lng: number }> {
  const worker = new Worker(
    "geofence-processing",
    async (job) => {
      const { vehicleId, tripId, routeId, lat, lng } = job.data;
      const results = await processGeofence(vehicleId, tripId, routeId, lat, lng, Date.now());
      return { success: true, vehicleId, tripId, events: results.length };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[Geofence] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[Geofence] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createOfflineDetectionWorker(): Worker {
  const worker = new Worker(
    "offline-detection",
    async () => {
      const result = await sweepOfflineVehicles();
      const drivers = await sweepIdleDrivers();
      logger.info(`[Offline Detection] Sweep complete`, { ...result, ...drivers });
      return { success: true, ...result, ...drivers };
    },
    { connection, concurrency: 1 }
  );
  worker.on("completed", (job) => logger.debug(`[Offline Detection] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[Offline Detection] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createTripStatsWorker(): Worker<{ tripId: string }> {
  const worker = new Worker<{ tripId: string }>(
    "trip-statistics",
    async (job) => {
      const { tripId } = job.data;
      const stats = await computeTripStatistics(tripId);
      if (!stats) throw new Error(`Trip ${tripId} not found for statistics computation`);
      return { success: true, tripId };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[Trip Stats] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[Trip Stats] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createOccupancyWorker(): Worker<OccupancyJob> {
  const worker = new Worker<OccupancyJob>(
    "occupancy-processing",
    async (job) => {
      const { vehicleId, tripId, routeId, passengerCount, capacity } = job.data;
      const result = await processOccupancyUpdate(vehicleId, tripId, routeId, passengerCount, capacity);
      return { success: true, vehicleId, tripId, level: result.currentLevel };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[Occupancy] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[Occupancy] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createEventProcessingWorker(): Worker<EventProcessingJob> {
  const worker = new Worker<EventProcessingJob>(
    "event-processing",
    async (job) => {
      const { eventType, payload, traceId } = job.data;
      // BullMQ-backed durable redelivery layer: Redis Pub/Sub gives no
      // redelivery guarantee on its own, so every publishEvent() call also
      // lands here; this re-publishes so a consumer that reconnects after a
      // restart still receives it (idempotent downstream via traceId).
      // Uses republishEvent (not publishEvent) so it does not re-enqueue itself.
      await republishEvent(eventType, payload, traceId);
      return { success: true, eventType, traceId };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[Event Processing] Job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`[Event Processing] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

function createHistoricalDataWorker(): Worker {
  const worker = new Worker(
    "historical-data",
    async (job) => {
      if (job.name === "archive-old-gps") {
        const settings = await getTrackingSettings();
        const result = await archiveOldGPSHistory(settings.gpsHistoryRetentionDays);
        return { success: true, ...result };
      }
      const point = job.data as GPSPoint;
      await persistGPSPointDirect(point);
      return { success: true, vehicleId: point.vehicleId, tripId: point.tripId };
    },
    { connection, concurrency: trackingConfig.queue.concurrency }
  );
  worker.on("completed", (job) => logger.debug(`[Historical Data] Job ${job.id} (${job.name}) completed`));
  worker.on("failed", (job, err) => logger.error(`[Historical Data] Job ${job?.id} failed: ${err.message}`));
  return worker;
}

export async function startTrackingWorkers(): Promise<void> {
  await connectDB();

  workers.push(
    createGPSProcessingWorker(),
    createETACalculationWorker(),
    createGeofenceWorker(),
    createOfflineDetectionWorker(),
    createTripStatsWorker(),
    createOccupancyWorker(),
    createEventProcessingWorker(),
    createHistoricalDataWorker()
  );

  await scheduleRepeatableJobs();

  logger.info("All tracking workers started");

  process.on("SIGINT", async () => {
    logger.info("Shutting down tracking workers...");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Shutting down tracking workers...");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startTrackingWorkers().catch((err) => {
    logger.error(`Failed to start tracking worker: ${err.message}`);
    process.exit(1);
  });
}
