import { GPSHistory, IGPSHistory } from "../models/gpsHistory.model.js";
import { Trip } from "../../../modules/trip/trip.model.js";
import { historicalDataQueue } from "../queues/tracking.queues.js";
import logger from "../../../utils/logger.js";

export interface GPSPoint {
  vehicleId: string;
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: number;
}

export const persistGPSPoint = async (point: GPSPoint): Promise<void> => {
  try {
    await historicalDataQueue.add("persist-gps", point, {
      priority: 1,
    });
  } catch (err) {
    logger.error(`Failed to enqueue GPS point for persistence: ${(err as Error).message}`);
  }
};

export const persistGPSPointDirect = async (point: GPSPoint): Promise<void> => {
  try {
    await GPSHistory.create({
      timestamp: new Date(point.timestamp),
      meta: {
        vehicleId: point.vehicleId,
        tripId: point.tripId,
        driverId: point.driverId,
      },
      location: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
      speed: point.speed,
      heading: point.heading,
      accuracy: point.accuracy,
    });
  } catch (err) {
    logger.error(`Failed to persist GPS point: ${(err as Error).message}`);
  }
};

export const persistBulkGPSPoints = async (points: GPSPoint[]): Promise<{ persisted: number; failed: number }> => {
  let persisted = 0;
  let failed = 0;

  const docs = points.map((p) => ({
    timestamp: new Date(p.timestamp),
    meta: {
      vehicleId: p.vehicleId,
      tripId: p.tripId,
      driverId: p.driverId,
    },
    location: {
      type: "Point" as const,
      coordinates: [p.longitude, p.latitude] as [number, number],
    },
    speed: p.speed,
    heading: p.heading,
    accuracy: p.accuracy,
  }));

  try {
    const result = await GPSHistory.insertMany(docs, { ordered: false }).catch(() => {
      return { insertedCount: 0 };
    });
    persisted = (result as { insertedCount: number }).insertedCount ?? docs.length;
    failed = docs.length - persisted;
  } catch (err) {
    logger.error(`Failed to bulk persist GPS points: ${(err as Error).message}`);
    failed = docs.length;
  }

  return { persisted, failed };
};

export const getTripGPSHistory = async (
  tripId: string,
  options: { from?: number; to?: number; page?: number; limit?: number } = {}
): Promise<{
  points: Array<{
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy: number;
    timestamp: number;
  }>;
  total: number;
  page: number;
  limit: number;
}> => {
  const { from, to, page = 1, limit = 100 } = options;

  const query: Record<string, unknown> = { "meta.tripId": tripId };
  if (from || to) {
    const tsFilter: Record<string, Date> = {};
    if (from) tsFilter.$gte = new Date(from);
    if (to) tsFilter.$lte = new Date(to);
    query.timestamp = tsFilter;
  }

  const total = await GPSHistory.countDocuments(query);

  const points = await GPSHistory.find(query)
    .sort({ timestamp: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    points: points.map((p) => ({
      latitude: p.location.coordinates[1],
      longitude: p.location.coordinates[0],
      speed: p.speed,
      heading: p.heading,
      accuracy: p.accuracy,
      timestamp: new Date(p.timestamp).getTime(),
    })),
    total,
    page,
    limit,
  };
};

/** P2-19 — a compact per-trip path kept on the Trip doc for long-term replay after raw points expire. */
export const downsamplePath = (
  points: Array<{ latitude: number; longitude: number; timestamp: number }>,
  maxPoints = 200
): Array<{ lat: number; lng: number; timestamp: number }> => {
  if (points.length <= maxPoints) {
    return points.map((p) => ({ lat: p.latitude, lng: p.longitude, timestamp: p.timestamp }));
  }
  const step = points.length / maxPoints;
  const sampled: Array<{ lat: number; lng: number; timestamp: number }> = [];
  for (let i = 0; i < maxPoints; i++) {
    const p = points[Math.floor(i * step)];
    sampled.push({ lat: p.latitude, lng: p.longitude, timestamp: p.timestamp });
  }
  const last = points[points.length - 1];
  sampled.push({ lat: last.latitude, lng: last.longitude, timestamp: last.timestamp });
  return sampled;
};

export const archiveOldGPSHistory = async (
  retentionDays: number
): Promise<{ deleted: number }> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const result = await GPSHistory.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
    logger.info(`GPS history archival: deleted ${result.deletedCount} points older than ${retentionDays} days`);
    return { deleted: result.deletedCount };
  } catch (err) {
    logger.error(`GPS history archival failed: ${(err as Error).message}`);
    return { deleted: 0 };
  }
};
