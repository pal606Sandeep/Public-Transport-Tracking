import { GPSHistory } from "../models/gpsHistory.model.js";
import { Trip } from "../../../modules/trip/trip.model.js";
import { getDistanceInMeters } from "../../../utils/distance.util.js";
import { publishEvent } from "../event-bus.service.js";
import { loadRouteCache } from "./geospatial.service.js";
import { downsamplePath } from "./gps-history.service.js";
import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import logger from "../../../utils/logger.js";

const STOP_ARRIVAL_RADIUS_METERS = 50;

export interface TripStatistics {
  tripId: string;
  vehicleId: string;
  routeId: string;
  driverId: string;
  totalDistanceMeters: number;
  movingTimeSeconds: number;
  idleTimeSeconds: number;
  stopsServed: number;
  perStopActualVsScheduled: Array<{
    stopId: string;
    sequence: number;
    scheduledArrival: number;
    actualArrival: number;
    delaySeconds: number;
  }>;
  onTimePercentage: number;
  overallDelaySeconds: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  tripStartedAt: number;
  tripEndedAt: number;
}

const IDLE_SPEED_THRESHOLD_KMH = 2;
const MOVING_SPEED_THRESHOLD_KMH = 2;

export const computeTripStatistics = async (tripId: string): Promise<TripStatistics | null> => {
  const trip = await Trip.findById(tripId).lean();
  if (!trip) return null;

  const vehicleId = trip.vehicle?.toString() || "";
  const routeId = trip.route?.toString() || "";
  const driverId = trip.driver?.toString() || "";

  const points = await GPSHistory.find({ "meta.tripId": tripId })
    .sort({ timestamp: 1 })
    .lean();

  if (points.length < 2) {
    return {
      tripId,
      vehicleId,
      routeId,
      driverId,
      totalDistanceMeters: 0,
      movingTimeSeconds: 0,
      idleTimeSeconds: 0,
      stopsServed: 0,
      perStopActualVsScheduled: [],
      onTimePercentage: 100,
      overallDelaySeconds: 0,
      averageSpeedKmh: 0,
      maxSpeedKmh: 0,
      tripStartedAt: trip.startTime ? new Date(trip.startTime).getTime() : 0,
      tripEndedAt: trip.endTime ? new Date(trip.endTime).getTime() : Date.now(),
    };
  }

  let totalDistance = 0;
  let movingTimeMs = 0;
  let idleTimeMs = 0;
  let maxSpeedKmh = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const dist = getDistanceInMeters(
      prev.location.coordinates[1],
      prev.location.coordinates[0],
      curr.location.coordinates[1],
      curr.location.coordinates[0]
    );
    totalDistance += dist;

    const timeMs = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
    const speedKmh = curr.speed * 3.6;

    if (speedKmh > maxSpeedKmh) maxSpeedKmh = speedKmh;

    if (speedKmh < MOVING_SPEED_THRESHOLD_KMH) {
      idleTimeMs += timeMs;
    } else {
      movingTimeMs += timeMs;
    }
  }

  const tripStartedAt = points[0] ? new Date(points[0].timestamp).getTime() : 0;
  const tripEndedAt = points[points.length - 1] ? new Date(points[points.length - 1].timestamp).getTime() : Date.now();

  const totalDurationMs = tripEndedAt - tripStartedAt;
  const averageSpeedKmh = totalDurationMs > 0
    ? (totalDistance / 1000) / (totalDurationMs / 3600000)
    : 0;

  const { perStopActualVsScheduled, stopsServed, onTimePercentage, overallDelaySeconds } =
    await computePerStopDelays(routeId, trip.scheduledStartAt ? new Date(trip.scheduledStartAt).getTime() : null, points);

  const stats: TripStatistics = {
    tripId,
    vehicleId,
    routeId,
    driverId,
    totalDistanceMeters: Math.round(totalDistance),
    movingTimeSeconds: Math.round(movingTimeMs / 1000),
    idleTimeSeconds: Math.round(idleTimeMs / 1000),
    stopsServed,
    perStopActualVsScheduled,
    onTimePercentage,
    overallDelaySeconds,
    averageSpeedKmh: Math.round(averageSpeedKmh * 10) / 10,
    maxSpeedKmh: Math.round(maxSpeedKmh),
    tripStartedAt,
    tripEndedAt,
  };

  const path = downsamplePath(
    points.map((p) => ({
      latitude: p.location.coordinates[1],
      longitude: p.location.coordinates[0],
      timestamp: new Date(p.timestamp).getTime(),
    }))
  );

  await Trip.findByIdAndUpdate(tripId, {
    summary: {
      totalDistanceMeters: stats.totalDistanceMeters,
      movingTimeSeconds: stats.movingTimeSeconds,
      idleTimeSeconds: stats.idleTimeSeconds,
      stopsServed: stats.stopsServed,
      onTimePercentage: stats.onTimePercentage,
      overallDelaySeconds: stats.overallDelaySeconds,
      averageSpeedKmh: stats.averageSpeedKmh,
      maxSpeedKmh: stats.maxSpeedKmh,
      path,
    },
  }).catch((err: Error) => {
    logger.error(`Failed to update trip summary: ${err.message}`);
  });

  await publishEvent("TRIP_STATS_READY", {
    ...stats,
    timestamp: Date.now(),
  });

  return stats;
};

/**
 * For each stop on the route, find the first GPS point that came within
 * STOP_ARRIVAL_RADIUS_METERS of it (in stop sequence order) and treat its
 * timestamp as the actual arrival. Compared against
 * trip.scheduledStartAt + stop.scheduledOffsetMinutes.
 */
async function computePerStopDelays(
  routeId: string,
  scheduledStartMs: number | null,
  points: Array<{ location: { coordinates: [number, number] }; timestamp: Date }>
): Promise<{
  perStopActualVsScheduled: TripStatistics["perStopActualVsScheduled"];
  stopsServed: number;
  onTimePercentage: number;
  overallDelaySeconds: number;
}> {
  const empty = { perStopActualVsScheduled: [], stopsServed: 0, onTimePercentage: 100, overallDelaySeconds: 0 };
  if (!routeId) return empty;

  const route = await loadRouteCache(routeId).catch(() => null);
  if (!route || route.stops.length === 0) return empty;

  const settings = await getTrackingSettings();
  const perStopActualVsScheduled: TripStatistics["perStopActualVsScheduled"] = [];
  let searchFrom = 0;

  for (const stop of [...route.stops].sort((a, b) => a.sequence - b.sequence)) {
    let actualArrival = 0;
    for (let i = searchFrom; i < points.length; i++) {
      const p = points[i];
      const dist = getDistanceInMeters(
        p.location.coordinates[1],
        p.location.coordinates[0],
        stop.lat,
        stop.lng
      );
      if (dist <= STOP_ARRIVAL_RADIUS_METERS) {
        actualArrival = new Date(p.timestamp).getTime();
        searchFrom = i;
        break;
      }
    }
    if (!actualArrival) continue;

    const scheduledArrival = scheduledStartMs !== null ? scheduledStartMs + stop.scheduledOffsetMinutes * 60_000 : actualArrival;
    perStopActualVsScheduled.push({
      stopId: stop.stopId,
      sequence: stop.sequence,
      scheduledArrival,
      actualArrival,
      delaySeconds: Math.round((actualArrival - scheduledArrival) / 1000),
    });
  }

  const stopsServed = perStopActualVsScheduled.length;
  const onTimeCount = perStopActualVsScheduled.filter(
    (s) => Math.abs(s.delaySeconds) <= settings.delayThresholds.onTime
  ).length;
  const onTimePercentage = stopsServed > 0 ? Math.round((onTimeCount / stopsServed) * 100) : 100;
  const overallDelaySeconds = stopsServed > 0
    ? Math.round(perStopActualVsScheduled.reduce((sum, s) => sum + s.delaySeconds, 0) / stopsServed)
    : 0;

  return { perStopActualVsScheduled, stopsServed, onTimePercentage, overallDelaySeconds };
}
