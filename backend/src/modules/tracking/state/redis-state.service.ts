import redisClient from "../../../config/redis.js";
import logger from "../../../utils/logger.js";

/**
 * P2-03 — Redis real-time state schema.
 *
 * Keys:
 *   vehicle:{id}:location   (string JSON  -> VehicleLocation)   TTL
 *   vehicle:{id}:status     (hash         -> VehicleStatus)     TTL
 *   vehicle:{id}:eta        (string JSON  -> VehicleETA)        TTL
 *   vehicle:{id}:occupancy  (string JSON  -> VehicleOccupancy)  TTL
 *   trip:{id}:state         (hash                                TTL
 *   driver:{id}:status      (hash                                TTL
 *   route:{id}:vehicles     (set of active vehicle ids)          TTL
 *
 * Redis is NEVER the source of truth — every key has a TTL and can be rebuilt
 * from Mongo on cold start (see rebuildTrackingState).
 */

export const REDIS_KEYS = {
  vehicleLocation: (id: string) => `vehicle:${id}:location`,
  vehicleStatus: (id: string) => `vehicle:${id}:status`,
  vehicleEta: (id: string) => `vehicle:${id}:eta`,
  vehicleOccupancy: (id: string) => `vehicle:${id}:occupancy`,
  tripState: (id: string) => `trip:${id}:state`,
  driverStatus: (id: string) => `driver:${id}:status`,
  routeVehicles: (id: string) => `route:${id}:vehicles`,
} as const;

export const STATE_TTL = {
  location: 300,
  // See tracking.service.ts STATUS_TTL — must outlive the offline-detection
  // sweep's timeout window.
  status: 1800,
  eta: 300,
  occupancy: 300,
  trip: 600,
  driver: 1800,
  routeVehicles: 600,
} as const;

export const setVehicleLocationState = async (
  vehicleId: string,
  loc: Record<string, unknown>
): Promise<void> => {
  await redisClient.set(
    REDIS_KEYS.vehicleLocation(vehicleId),
    JSON.stringify(loc),
    "EX",
    STATE_TTL.location
  );
};

export const getVehicleLocationState = async (
  vehicleId: string
): Promise<Record<string, unknown> | null> => {
  const raw = await redisClient.get(REDIS_KEYS.vehicleLocation(vehicleId));
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

export const setVehicleStatusState = async (
  vehicleId: string,
  fields: Record<string, string | number>
): Promise<void> => {
  const cmds: Array<string | number> = [];
  for (const [k, v] of Object.entries(fields)) {
    cmds.push(k, String(v));
  }
  await redisClient.hset(REDIS_KEYS.vehicleStatus(vehicleId), ...cmds);
  await redisClient.expire(REDIS_KEYS.vehicleStatus(vehicleId), STATE_TTL.status);
};

export const getVehicleStatusState = async (
  vehicleId: string
): Promise<Record<string, string> | null> => {
  const raw = await redisClient.hgetall(REDIS_KEYS.vehicleStatus(vehicleId));
  return raw && Object.keys(raw).length ? raw : null;
};

export const setVehicleEtaState = async (
  vehicleId: string,
  eta: Record<string, unknown>
): Promise<void> => {
  await redisClient.set(
    REDIS_KEYS.vehicleEta(vehicleId),
    JSON.stringify(eta),
    "EX",
    STATE_TTL.eta
  );
};

export const getVehicleEtaState = async (
  vehicleId: string
): Promise<Record<string, unknown> | null> => {
  const raw = await redisClient.get(REDIS_KEYS.vehicleEta(vehicleId));
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

export const setVehicleOccupancyState = async (
  vehicleId: string,
  occ: Record<string, unknown>
): Promise<void> => {
  await redisClient.set(
    REDIS_KEYS.vehicleOccupancy(vehicleId),
    JSON.stringify(occ),
    "EX",
    STATE_TTL.occupancy
  );
};

export const getVehicleOccupancyState = async (
  vehicleId: string
): Promise<Record<string, unknown> | null> => {
  const raw = await redisClient.get(REDIS_KEYS.vehicleOccupancy(vehicleId));
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

export const setTripState = async (
  tripId: string,
  fields: Record<string, string | number>
): Promise<void> => {
  const cmds: Array<string | number> = [];
  for (const [k, v] of Object.entries(fields)) {
    cmds.push(k, String(v));
  }
  await redisClient.hset(REDIS_KEYS.tripState(tripId), ...cmds);
  await redisClient.expire(REDIS_KEYS.tripState(tripId), STATE_TTL.trip);
};

export const getTripState = async (
  tripId: string
): Promise<Record<string, string> | null> => {
  const raw = await redisClient.hgetall(REDIS_KEYS.tripState(tripId));
  return raw && Object.keys(raw).length ? raw : null;
};

export const setDriverStatusState = async (
  driverId: string,
  fields: Record<string, string | number>
): Promise<void> => {
  const cmds: Array<string | number> = [];
  for (const [k, v] of Object.entries(fields)) {
    cmds.push(k, String(v));
  }
  await redisClient.hset(REDIS_KEYS.driverStatus(driverId), ...cmds);
  await redisClient.expire(REDIS_KEYS.driverStatus(driverId), STATE_TTL.driver);
};

export const getDriverStatusState = async (
  driverId: string
): Promise<Record<string, string> | null> => {
  const raw = await redisClient.hgetall(REDIS_KEYS.driverStatus(driverId));
  return raw && Object.keys(raw).length ? raw : null;
};

export const addRouteVehicle = async (
  routeId: string,
  vehicleId: string
): Promise<void> => {
  await redisClient.sadd(REDIS_KEYS.routeVehicles(routeId), vehicleId);
  await redisClient.expire(REDIS_KEYS.routeVehicles(routeId), STATE_TTL.routeVehicles);
};

export const addRouteVehicles = async (
  routeId: string,
  vehicleIds: string[]
): Promise<void> => {
  await redisClient.sadd(REDIS_KEYS.routeVehicles(routeId), ...vehicleIds);
  await redisClient.expire(REDIS_KEYS.routeVehicles(routeId), STATE_TTL.routeVehicles);
};

export const removeRouteVehicle = async (
  routeId: string,
  vehicleId: string
): Promise<void> => {
  await redisClient.srem(REDIS_KEYS.routeVehicles(routeId), vehicleId);
};

export const getRouteVehicles = async (
  routeId: string
): Promise<string[]> => {
  return redisClient.smembers(REDIS_KEYS.routeVehicles(routeId));
};

export const clearVehicleState = async (vehicleId: string): Promise<void> => {
  await Promise.all([
    redisClient.del(REDIS_KEYS.vehicleLocation(vehicleId)),
    redisClient.del(REDIS_KEYS.vehicleStatus(vehicleId)),
    redisClient.del(REDIS_KEYS.vehicleEta(vehicleId)),
    redisClient.del(REDIS_KEYS.vehicleOccupancy(vehicleId)),
  ]);
};
