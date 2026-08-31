import { setDriverStatusState, getDriverStatusState } from "../state/redis-state.service.js";
import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import redisClient from "../../../config/redis.js";
import { getIO } from "../../../config/socket.js";
import logger from "../../../utils/logger.js";

export type DriverStatusType = "ONLINE" | "OFFLINE" | "ON_TRIP" | "ON_BREAK" | "IDLE" | "SOS" | "GPS_ERROR";

export const updateDriverStatus = async (
  driverId: string,
  status: DriverStatusType,
  additionalData: Record<string, string | number> = {}
): Promise<void> => {
  await setDriverStatusState(driverId, {
    status,
    ...additionalData,
    updatedAt: Date.now(),
  });

  const io = getIO();
  io?.to("fleet:all").emit("driver:status", {
    driverId,
    status,
    ...additionalData,
    timestamp: Date.now(),
  });

  logger.debug(`Driver ${driverId} status: ${status}`, { driverId, status });
};

export const getDriverCurrentStatus = async (driverId: string): Promise<DriverStatusType | null> => {
  const state = await getDriverStatusState(driverId);
  return (state?.status as DriverStatusType) ?? null;
};

export const setDriverOnline = async (driverId: string, vehicleId?: string, tripId?: string): Promise<void> => {
  await updateDriverStatus(driverId, "ONLINE", {
    ...(vehicleId ? { vehicleId } : {}),
    ...(tripId ? { tripId } : {}),
  });
};

export const setDriverOnTrip = async (driverId: string, vehicleId: string, tripId: string, routeId?: string): Promise<void> => {
  await updateDriverStatus(driverId, "ON_TRIP", {
    vehicleId,
    tripId,
    ...(routeId ? { routeId } : {}),
  });
};

export const setDriverOnBreak = async (driverId: string, vehicleId: string, tripId: string): Promise<void> => {
  await updateDriverStatus(driverId, "ON_BREAK", { vehicleId, tripId });
};

export const setDriverOffline = async (driverId: string): Promise<void> => {
  await updateDriverStatus(driverId, "OFFLINE");
};

export const setDriverSOS = async (driverId: string, vehicleId: string): Promise<void> => {
  await updateDriverStatus(driverId, "SOS", { vehicleId });
};

export const setDriverGPSError = async (driverId: string, vehicleId: string): Promise<void> => {
  await updateDriverStatus(driverId, "GPS_ERROR", { vehicleId });
};

/**
 * P2-16 — a driver who is ONLINE but sends no fixes/heartbeats for a while
 * (foregrounded, not on a trip) is downgraded to IDLE. Scheduled from the
 * offline-detection sweep so it runs on the same cadence.
 */
export const sweepIdleDrivers = async (): Promise<{ checked: number; idled: number }> => {
  const settings = await getTrackingSettings();
  const idleTimeoutMs = settings.driverIdleTimeoutSeconds * 1000;
  const now = Date.now();

  const keys = await redisClient.keys("driver:*:status");
  let idled = 0;

  for (const key of keys) {
    const raw = await redisClient.hgetall(key);
    if (!raw || raw.status !== "ONLINE") continue;
    const updatedAt = Number(raw.updatedAt) || 0;
    if (now - updatedAt < idleTimeoutMs) continue;

    const driverId = key.split(":")[1];
    if (!driverId) continue;

    await updateDriverStatus(driverId, "IDLE", {
      ...(raw.vehicleId ? { vehicleId: raw.vehicleId } : {}),
    });
    idled++;
  }

  return { checked: keys.length, idled };
};
