import dotenv from "dotenv";

dotenv.config();

export const trackingConfig = {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  mongo: {
    uri: process.env.MONGO_URI || "",
  },
  gps: {
    sendIntervalSeconds: Number(process.env.GPS_SEND_INTERVAL_SECONDS) || 5,
    accuracyThresholdMeters: Number(process.env.GPS_ACCURACY_THRESHOLD_METERS) || 50,
    maxSpeedKmh: Number(process.env.GPS_MAX_SPEED_KMH) || 120,
    duplicateThresholdSeconds: Number(process.env.GPS_DUPLICATE_THRESHOLD_SECONDS) || 2,
  },
  geofence: {
    defaultRadiusMeters: Number(process.env.GEOFENCE_DEFAULT_RADIUS_METERS) || 100,
    depotRadiusMeters: Number(process.env.GEOFENCE_DEPOT_RADIUS_METERS) || 50,
  },
  eta: {
    thresholds: {
      onTime: Number(process.env.ETA_ON_TIME_THRESHOLD) || 300,
      delayed: Number(process.env.ETA_DELAYED_THRESHOLD) || 600,
      severe: Number(process.env.ETA_SEVERE_THRESHOLD) || 1200,
    },
  },
  delay: {
    thresholds: {
      onTime: Number(process.env.DELAY_ON_TIME_THRESHOLD) || 120,
      delayed: Number(process.env.DELAY_DELAYED_THRESHOLD) || 300,
      severe: Number(process.env.DELAY_SEVERE_THRESHOLD) || 600,
    },
  },
  deviation: {
    thresholdMeters: Number(process.env.DEVIATION_THRESHOLD_METERS) || 200,
    dwellSeconds: Number(process.env.DEVIATION_DWELL_SECONDS) || 30,
  },
  offline: {
    staleTimeoutSeconds: Number(process.env.OFFLINE_STALE_TIMEOUT_SECONDS) || 60,
    offlineTimeoutSeconds: Number(process.env.OFFLINE_OFFLINE_TIMEOUT_SECONDS) || 300,
  },
  queue: {
    concurrency: Number(process.env.QUEUE_CONCURRENCY) || 10,
    maxRetries: Number(process.env.QUEUE_MAX_RETRIES) || 3,
    backoffMs: Number(process.env.QUEUE_BACKOFF_MS) || 1000,
  },
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
} as const;

export type TrackingConfig = typeof trackingConfig;