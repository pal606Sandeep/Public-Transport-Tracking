import redisClient from "../../config/redis.js";
import logger from "../../utils/logger.js";
import { trackingConfig } from "./config/tracking.config.js";

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
const STATUS_TTL = 300;
const ETA_TTL = 300;
const OCCUPANCY_TTL = 300;

export const updateVehicleLocation = async (
  data: GPSSchema
): Promise<VehicleLocation> => {
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

export const getVehicleLocation = async (
  vehicleId: string
): Promise<VehicleLocation | null> => {
  const raw = await redisClient.get(`vehicle:${vehicleId}:location`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as VehicleLocation;
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

export const getVehicleStatus = async (
  vehicleId: string
): Promise<VehicleStatus | null> => {
  const raw = await redisClient.hgetall(`vehicle:${vehicleId}:status`);
  if (!raw || Object.keys(raw).length === 0) {
    return null;
  }
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

export const updateVehicleETA = async (
  data: VehicleETA
): Promise<void> => {
  const key = `vehicle:${data.vehicleId}:eta`;
  await redisClient.set(key, JSON.stringify(data), "EX", ETA_TTL);
  
  logger.debug(`Updated ETA for vehicle ${data.vehicleId}`, {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    etaSeconds: data.etaSeconds,
  });
};

export const getVehicleETA = async (
  vehicleId: string
): Promise<VehicleETA | null> => {
  const raw = await redisClient.get(`vehicle:${vehicleId}:eta`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as VehicleETA;
};

export const updateVehicleOccupancy = async (
  data: VehicleOccupancy
): Promise<void> => {
  const key = `vehicle:${data.vehicleId}:occupancy`;
  await redisClient.set(key, JSON.stringify(data), "EX", OCCUPANCY_TTL);
  
  logger.debug(`Updated occupancy for vehicle ${data.vehicleId}`, {
    vehicleId: data.vehicleId,
    tripId: data.tripId,
    level: data.level,
  });
};

export const getVehicleOccupancy = async (
  vehicleId: string
): Promise<VehicleOccupancy | null> => {
  const raw = await redisClient.get(`vehicle:${vehicleId}:occupancy`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as VehicleOccupancy;
};

export const publishLocationUpdate = async (data: GPSSchema): Promise<void> => {
  await redisClient.publish("vehicle:location:updates", JSON.stringify(data));
};

export const enqueueGPSProcessing = async (data: GPSSchema): Promise<void> => {
  const { gpsProcessingQueue } = await import("./queues/tracking.queues.js");
  await gpsProcessingQueue.add("process-gps", data);
};

export const getTrackingConfig = () => trackingConfig;