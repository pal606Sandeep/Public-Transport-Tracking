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
} from "../queues/tracking.queues.js";

const connection = redisOptions;

interface GPSProcessingJob {
  vehicleId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
  driverId: string;
}

interface ETACalculationJob {
  vehicleId: string;
  tripId: string;
  routeId: string;
  currentLocation: { lat: number; lng: number };
  speed: number;
}

interface GeofenceJob {
  vehicleId: string;
  tripId: string;
  location: { lat: number; lng: number };
  routeId: string;
}

interface OfflineDetectionJob {
  vehicleId: string;
  lastSeen: number;
}

interface TripStatsJob {
  tripId: string;
  vehicleId: string;
  driverId: string;
}

interface OccupancyJob {
  vehicleId: string;
  tripId: string;
  passengerCount: number;
  capacity: number;
}

interface EventProcessingJob {
  eventType: string;
  payload: Record<string, unknown>;
  traceId: string;
}

interface HistoricalDataJob {
  tripId: string;
  points: Array<{
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    timestamp: number;
  }>;
}

const workers: Worker[] = [];

function createGPSProcessingWorker(): Worker<GPSProcessingJob> {
  const worker = new Worker<GPSProcessingJob>(
    "gps-processing",
    async (job) => {
      const { vehicleId, tripId, latitude, longitude, speed, heading, accuracy, timestamp, driverId } = job.data;
      logger.info(`[GPS Processing] Processing GPS for vehicle ${vehicleId}, trip ${tripId}`);
      
      // TODO: Implement GPS anomaly detection, validation, Redis update
      // This will be implemented in P2-04, P2-05
      
      return { success: true, vehicleId, tripId };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[GPS Processing] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[GPS Processing] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createETACalculationWorker(): Worker<ETACalculationJob> {
  const worker = new Worker<ETACalculationJob>(
    "eta-calculation",
    async (job) => {
      const { vehicleId, tripId, routeId, currentLocation, speed } = job.data;
      logger.info(`[ETA Calculation] Calculating ETA for vehicle ${vehicleId}, trip ${tripId}`);
      
      // TODO: Implement ETA calculation using @turf
      // This will be implemented in P2-12
      
      return { success: true, vehicleId, tripId };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[ETA Calculation] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[ETA Calculation] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createGeofenceWorker(): Worker<GeofenceJob> {
  const worker = new Worker<GeofenceJob>(
    "geofence-processing",
    async (job) => {
      const { vehicleId, tripId, location, routeId } = job.data;
      logger.info(`[Geofence] Processing geofence for vehicle ${vehicleId}, trip ${tripId}`);
      
      // TODO: Implement geofencing logic using @turf
      // This will be implemented in P2-10
      
      return { success: true, vehicleId, tripId };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Geofence] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Geofence] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createOfflineDetectionWorker(): Worker<OfflineDetectionJob> {
  const worker = new Worker<OfflineDetectionJob>(
    "offline-detection",
    async (job) => {
      const { vehicleId, lastSeen } = job.data;
      logger.info(`[Offline Detection] Checking offline status for vehicle ${vehicleId}`);
      
      // TODO: Implement offline/stale detection
      // This will be implemented in P2-15
      
      return { success: true, vehicleId };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Offline Detection] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Offline Detection] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createTripStatsWorker(): Worker<TripStatsJob> {
  const worker = new Worker<TripStatsJob>(
    "trip-statistics",
    async (job) => {
      const { tripId, vehicleId, driverId } = job.data;
      logger.info(`[Trip Stats] Computing statistics for trip ${tripId}`);
      
      // TODO: Implement trip statistics computation
      // This will be implemented in P2-21
      
      return { success: true, tripId };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Trip Stats] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Trip Stats] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createOccupancyWorker(): Worker<OccupancyJob> {
  const worker = new Worker<OccupancyJob>(
    "occupancy-processing",
    async (job) => {
      const { vehicleId, tripId, passengerCount, capacity } = job.data;
      logger.info(`[Occupancy] Processing occupancy for vehicle ${vehicleId}, trip ${tripId}`);
      
      // TODO: Implement occupancy derivation and broadcast
      // This will be implemented in P2-22
      
      return { success: true, vehicleId, tripId };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Occupancy] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Occupancy] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createEventProcessingWorker(): Worker<EventProcessingJob> {
  const worker = new Worker<EventProcessingJob>(
    "event-processing",
    async (job) => {
      const { eventType, payload, traceId } = job.data;
      logger.info(`[Event Processing] Processing event ${eventType} (trace: ${traceId})`);
      
      // TODO: Implement event bus publishing to Person 1
      // This will be implemented in P2-23
      
      return { success: true, eventType };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Event Processing] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Event Processing] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

function createHistoricalDataWorker(): Worker<HistoricalDataJob> {
  const worker = new Worker<HistoricalDataJob>(
    "historical-data",
    async (job) => {
      const { tripId, points } = job.data;
      logger.info(`[Historical Data] Persisting GPS history for trip ${tripId} (${points.length} points)`);
      
      // TODO: Implement GPS history persistence to MongoDB time-series
      // This will be implemented in P2-19
      
      return { success: true, tripId, pointsCount: points.length };
    },
    {
      connection,
      concurrency: trackingConfig.queue.concurrency,
    }
  );

  worker.on("completed", (job) => {
    logger.debug(`[Historical Data] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Historical Data] Job ${job?.id} failed: ${err.message}`);
  });

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
    logger.error(`Failed to start tracking workers: ${err.message}`);
    process.exit(1);
  });
}