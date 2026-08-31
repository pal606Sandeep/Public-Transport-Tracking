import mongoose from "mongoose";
import redisClient from "../../config/redis.js";
import logger from "../../utils/logger.js";
import { trackingConfig } from "./config/tracking.config.js";
import { AppError } from "../../utils/AppError.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { Trip } from "../trip/trip.model.js";
import { Driver } from "../driver/driver.model.js";
import { detectGPSAnomaly, isDuplicateFix, AnomalyResult } from "./anomaly/gps-anomaly.service.js";
import { detectCurrentStop } from "./geo/current-stop.service.js";
import { calculateETA } from "./geo/eta.service.js";
import { detectRouteDeviation } from "./geo/deviation.service.js";
import { processGeofence } from "./geo/geofence-processing.service.js";
import { updateDriverStatus, getDriverCurrentStatus } from "./geo/driver-status.service.js";
import { broadcastGeofenceEvent, broadcastRouteDeviation, broadcastDelayStatus } from "./geo/broadcast.service.js";
import { persistGPSPoint } from "./geo/gps-history.service.js";
import { detectDelay } from "./geo/delay.service.js";
import { loadRouteCache } from "./geo/geospatial.service.js";
import { addRouteVehicle } from "./state/redis-state.service.js";
import { publishEvent } from "./event-bus.service.js";
import { getIO } from "../../config/socket.js";

export interface VehicleLocation {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  accuracy?: number;
  timestamp: number;
}

export interface VehicleStatus {
  vehicleId: string;
  status: "ONLINE" | "OFFLINE" | "STALE" | "ON_TRIP" | "ON_BREAK" | "IDLE" | "SOS" | "GPS_ERROR";
  tripId?: string;
  routeId?: string;
  driverId?: string;
  lastSeen: number;
  updatedAt: number;
  offlineSince?: number;
}

export interface VehicleETA {
  vehicleId: string;
  tripId: string;
  nextStopId: string;
  nextStopName: string;
  etaSeconds: number;
  distanceMeters: number;
  updatedAt: number;
}

export interface VehicleOccupancy {
  vehicleId: string;
  tripId: string;
  passengerCount: number;
  capacity: number;
  level: "LOW" | "MODERATE" | "CROWDED";
  updatedAt: number;
}

export interface GPSSchema {
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

const LOCATION_TTL = 300;
// Longer than the offline-detection timeout (default 300s, tunable via System
// Settings): the status hash carries `lastSeen`/`offlineSince` bookkeeping the
// P2-15 sweep depends on, so it must outlive silence long enough for the
// sweep to actually observe and mark OFFLINE before the key itself expires.
const STATUS_TTL = 1800;
const ETA_TTL = 300;
const OCCUPANCY_TTL = 300;

const isObjectId = (id: unknown): boolean => mongoose.Types.ObjectId.isValid(id as string);

export const validateGPSSchema = async (
  data: GPSSchema
): Promise<{ vehicle: any; trip: any; driver: any }> => {
  const { vehicleId, tripId, driverId, latitude, longitude, speed, accuracy, timestamp } = data;

  if (!isObjectId(vehicleId) || !isObjectId(tripId) || !isObjectId(driverId)) {
    throw AppError.badRequest("Invalid ObjectId in tracking payload", "INVALID_ID");
  }

  const now = Date.now();

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw AppError.badRequest("Invalid timestamp", "INVALID_TIMESTAMP");
  }

  if (Math.abs(now - timestamp) > 24 * 60 * 60 * 1000) {
    logger.warn(`GPS timestamp skew detected for vehicle ${vehicleId}`, {
      vehicleId,
      timestamp,
      serverTime: now,
      skewMs: now - timestamp,
    });
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw AppError.badRequest(`Invalid latitude: ${latitude}`, "INVALID_LATITUDE");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw AppError.badRequest(`Invalid longitude: ${longitude}`, "INVALID_LONGITUDE");
  }

  if (!Number.isFinite(speed) || speed < 0) {
    throw AppError.badRequest(`Invalid speed: ${speed}`, "INVALID_SPEED");
  }

  if (!Number.isFinite(accuracy) || accuracy < 0) {
    throw AppError.badRequest(`Invalid accuracy: ${accuracy}`, "INVALID_ACCURACY");
  }

  const [vehicle, trip, driver] = await Promise.all([
    Vehicle.findById(vehicleId).lean(),
    Trip.findById(tripId).lean(),
    Driver.findById(driverId).lean(),
  ]);

  if (!vehicle) {
    throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");
  }

  if (!trip) {
    throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
  }

  if (!driver) {
    throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");
  }

  if (trip.status !== "ACTIVE" && trip.status !== "PAUSED") {
    throw AppError.conflict(
      `Trip ${tripId} is not active (status: ${trip.status})`,
      "TRIP_NOT_ACTIVE"
    );
  }

  if (trip.vehicle?.toString() !== vehicleId) {
    throw AppError.forbidden("Vehicle is not assigned to this trip", "VEHICLE_NOT_ASSIGNED");
  }

  if (trip.driver?.toString() !== driverId) {
    throw AppError.forbidden("Driver is not assigned to this trip", "DRIVER_NOT_ASSIGNED");
  }

  return { vehicle, trip: trip as any, driver: driver as any };
};

export const updateVehicleLocation = async (data: GPSSchema): Promise<VehicleLocation> => {
  const payload: VehicleLocation = {
    vehicleId: data.vehicleId,
    lat: data.latitude,
    lon: data.longitude,
    speed: data.speed,
    heading: data.heading,
    accuracy: data.accuracy,
    timestamp: data.timestamp,
  };

  const locationKey = `vehicle:${data.vehicleId}:location`;
  const statusKey = `vehicle:${data.vehicleId}:status`;

  await Promise.all([
    redisClient.set(locationKey, JSON.stringify(payload), "EX", LOCATION_TTL),
    redisClient.hset(statusKey, {
      lastSeen: data.timestamp.toString(),
      status: "ON_TRIP",
      tripId: data.tripId,
      driverId: data.driverId,
      updatedAt: Date.now().toString(),
    }),
    redisClient.expire(statusKey, STATUS_TTL),
  ]);

  logger.debug(`Updated location for vehicle ${data.vehicleId}`, {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
  });

  return payload;
};

export const getVehicleLocation = async (vehicleId: string): Promise<VehicleLocation | null> => {
  const raw = await redisClient.get(`vehicle:${vehicleId}:location`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VehicleLocation;
  } catch {
    return null;
  }
};

export const updateVehicleStatus = async (
  vehicleId: string,
  status: VehicleStatus["status"],
  additionalData: Partial<VehicleStatus> = {}
): Promise<void> => {
  const statusKey = `vehicle:${vehicleId}:status`;
  await redisClient.hset(statusKey, {
    status,
    ...additionalData,
    updatedAt: Date.now().toString(),
  });
  await redisClient.expire(statusKey, STATUS_TTL);

  logger.info(`Vehicle ${vehicleId} status updated to ${status}`, {
    vehicleId,
    status,
    ...additionalData,
  });
};

export const getVehicleStatus = async (vehicleId: string): Promise<VehicleStatus | null> => {
  const raw = await redisClient.hgetall(`vehicle:${vehicleId}:status`);
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    vehicleId,
    status: raw.status as VehicleStatus["status"],
    tripId: raw.tripId,
    routeId: raw.routeId,
    driverId: raw.driverId,
    lastSeen: Number(raw.lastSeen) || 0,
    updatedAt: Number(raw.updatedAt) || 0,
  };
};

export const updateVehicleETA = async (data: VehicleETA): Promise<void> => {
  const key = `vehicle:${data.vehicleId}:eta`;
  await redisClient.set(key, JSON.stringify(data), "EX", ETA_TTL);

  logger.debug(`Updated ETA for vehicle ${data.vehicleId}`, {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    etaSeconds: data.etaSeconds,
  });
};

export const getVehicleETA = async (vehicleId: string): Promise<VehicleETA | null> => {
  const raw = await redisClient.get(`vehicle:${vehicleId}:eta`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VehicleETA;
  } catch {
    return null;
  }
};

export const updateVehicleOccupancy = async (data: VehicleOccupancy): Promise<void> => {
  const key = `vehicle:${data.vehicleId}:occupancy`;
  await redisClient.set(key, JSON.stringify(data), "EX", OCCUPANCY_TTL);

  logger.debug(`Updated occupancy for vehicle ${data.vehicleId}`, {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    level: data.level,
  });
};

export const getVehicleOccupancy = async (vehicleId: string): Promise<VehicleOccupancy | null> => {
  const raw = await redisClient.get(`vehicle:${vehicleId}:occupancy`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VehicleOccupancy;
  } catch {
    return null;
  }
};

export const processGPSSchema = async (data: GPSSchema): Promise<{ routeId: string }> => {
  const { vehicle, trip: validatedTrip } = await validateGPSSchema(data);
  let routeId = validatedTrip?.route?.toString() ?? vehicle.assignedRoute?.toString() ?? "";

  const anomaly: AnomalyResult = detectGPSAnomaly(
    data.vehicleId,
    data.latitude,
    data.longitude,
    data.speed,
    data.timestamp,
    data.accuracy
  );

  if (anomaly.isAnomaly) {
    logger.warn(`GPS anomaly for vehicle ${data.vehicleId}: ${anomaly.reason}`, {
      vehicleId: data.vehicleId,
      reason: anomaly.reason,
      details: anomaly.details,
    });

    await publishEvent("GPS_FAILURE", {
      vehicleId: data.vehicleId,
      tripId: data.tripId,
      driverId: data.driverId,
      reason: anomaly.reason,
      details: anomaly.details || "",
      lastValidLocation: { lat: data.latitude, lng: data.longitude },
      timestamp: Date.now(),
    });

    throw AppError.badRequest(`GPS fix rejected: ${anomaly.reason}`, anomaly.reason, {
      details: anomaly.details,
      severity: anomaly.severity,
    });
  }

  await updateVehicleLocation(data);

  if (data.tripId) {
    const trip = validatedTrip;

    if (routeId) {
      await addRouteVehicle(routeId, data.vehicleId);
    }

    const currentStop = await detectCurrentStop(routeId, data.latitude, data.longitude);

    const io = getIO();
    const broadcastData = {
      vehicleId: data.vehicleId,
      tripId: data.tripId,
      routeId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      heading: data.heading,
      currentStopId: currentStop?.currentStopId ?? null,
      nextStopId: currentStop?.nextStopId ?? null,
      timestamp: Date.now(),
    };

    io?.to(`vehicle:${data.vehicleId}`).emit("vehicle:location", broadcastData);
    if (routeId) io?.to(`route:${routeId}`).emit("vehicle:location", broadcastData);
    io?.to(`trip:${data.tripId}`).emit("vehicle:location", broadcastData);
    io?.to("fleet:all").emit("vehicle:location", broadcastData);

    const eta = await calculateETA(
      data.vehicleId,
      data.tripId,
      routeId,
      data.latitude,
      data.longitude,
      data.speed
    ).catch(() => null);

    if (eta && eta.nextStopId && trip?.scheduledStartAt) {
      const routeCache = await loadRouteCache(routeId).catch(() => null);
      const nextStopMeta = routeCache?.stops.find((s) => s.stopId === eta.nextStopId);
      if (nextStopMeta) {
        const scheduledArrivalMs =
          new Date(trip.scheduledStartAt).getTime() + nextStopMeta.scheduledOffsetMinutes * 60_000;
        const predictedArrivalMs = eta.etaTimestamp;

        const delay = await detectDelay(
          data.vehicleId,
          data.tripId,
          routeId,
          eta.nextStopId,
          scheduledArrivalMs,
          predictedArrivalMs
        ).catch(() => null);

        if (delay) {
          broadcastDelayStatus(data.vehicleId, data.tripId, routeId, delay.delayStatus, delay.delaySeconds);
        }
      }
    }

    const deviation = await detectRouteDeviation(
      data.vehicleId,
      data.tripId,
      routeId,
      data.latitude,
      data.longitude,
      Date.now()
    ).catch(() => null);

    if (deviation) {
      broadcastRouteDeviation(data.vehicleId, data.tripId, routeId, {
        isDeviated: deviation.isDeviated,
        distanceMeters: deviation.distanceMeters,
        durationAboveThresholdSeconds: deviation.durationAboveThresholdSeconds,
        nearestPointOnRoute: deviation.nearestPointOnRoute,
      });
    }

    const geofenceResults = await processGeofence(
      data.vehicleId,
      data.tripId,
      routeId,
      data.latitude,
      data.longitude,
      Date.now()
    ).catch(() => [] as Awaited<ReturnType<typeof processGeofence>>);

    for (const gfEvent of geofenceResults) {
      broadcastGeofenceEvent(gfEvent.eventType, gfEvent.vehicleId, gfEvent.routeId, gfEvent.tripId, gfEvent.stopId, {
        distanceMeters: gfEvent.distanceMeters,
        lat: gfEvent.lat,
        lng: gfEvent.lng,
      });

      await publishEvent(
        gfEvent.eventType === "vehicle:arrived" ? "BUS_ARRIVED_STOP" :
        gfEvent.eventType === "vehicle:left" ? "BUS_LEFT_STOP" :
        gfEvent.eventType === "vehicle:approaching" ? "BUS_APPROACHING_STOP" : "BUS_ARRIVED_STOP",
        {
          vehicleId: gfEvent.vehicleId,
          tripId: gfEvent.tripId,
          routeId: gfEvent.routeId,
          stopId: gfEvent.stopId,
          sequence: gfEvent.sequence,
          timestamp: gfEvent.timestamp,
        }
      );
    }
  }

  await persistGPSPoint({
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    driverId: data.driverId,
    latitude: data.latitude,
    longitude: data.longitude,
    speed: data.speed,
    heading: data.heading,
    accuracy: data.accuracy,
    timestamp: data.timestamp,
  });

  return { routeId };
};

export const processHeartbeat = async (data: {
  vehicleId: string;
  tripId?: string;
  driverId?: string;
  timestamp?: number;
}): Promise<void> => {
  const ts = data.timestamp || Date.now();

  if (!isObjectId(data.vehicleId)) {
    throw AppError.badRequest("Invalid vehicleId", "INVALID_ID");
  }

  const vehicle = await Vehicle.findById(data.vehicleId).lean();
  if (!vehicle) {
    throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");
  }

  if (data.driverId && data.tripId) {
    await validateGPSSchema({
      vehicleId: data.vehicleId,
      tripId: data.tripId,
      driverId: data.driverId,
      latitude: 0,
      longitude: 0,
      speed: 0,
      heading: 0,
      accuracy: 0,
      timestamp: ts,
    }).catch(() => {
      return null;
    });
  }

  await redisClient.hset(`vehicle:${data.vehicleId}:status`, {
    lastSeen: ts.toString(),
    heartbeatAt: ts.toString(),
    updatedAt: Date.now().toString(),
    ...(data.tripId ? { tripId: data.tripId } : {}),
    ...(data.driverId ? { driverId: data.driverId } : {}),
  });
  await redisClient.expire(`vehicle:${data.vehicleId}:status`, STATUS_TTL);

  if (data.driverId) {
    await updateDriverStatus(data.driverId, "ONLINE", {
      ...(data.vehicleId ? { vehicleId: data.vehicleId } : {}),
    });
  }

  logger.debug(`Heartbeat received for vehicle ${data.vehicleId}`, {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    driverId: data.driverId,
  });
};

export const publishLocationUpdate = async (data: GPSSchema): Promise<void> => {
  await redisClient.publish("vehicle:location:updates", JSON.stringify(data));
};

export const enqueueGPSProcessing = async (data: GPSSchema): Promise<void> => {
  const { gpsProcessingQueue } = await import("./queues/tracking.queues.js");
  await gpsProcessingQueue.add("process-gps", data);
};

export const getTrackingConfig = () => trackingConfig;
