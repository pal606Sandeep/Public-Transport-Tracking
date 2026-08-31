import redisClient from "../../../config/redis.js";
import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import { publishEvent } from "../event-bus.service.js";
import { removeRouteVehicle } from "../state/redis-state.service.js";
import { Trip } from "../../../modules/trip/trip.model.js";
import logger from "../../../utils/logger.js";

export type OfflineReason = "GPS_OFFLINE" | "NETWORK_OFFLINE" | "DEVICE_OFFLINE" | "STALE_GPS";
export type VehicleSignalStatus = "ACTIVE" | "STALE" | "OFFLINE";

/**
 * P2-15 — two-stage offline/stale detection.
 *
 * State lives entirely in the `vehicle:{id}:status` Redis hash (lastSeen is
 * already written there by every GPS fix / heartbeat), so this evaluates
 * correctly regardless of which process (API or worker) runs it — unlike an
 * in-memory map, which would only see updates from its own process.
 */

const statusKeyOf = (vehicleId: string): string => `vehicle:${vehicleId}:status`;

const vehicleIdFromKey = (key: string): string => key.split(":")[1] ?? "";

export const evaluateVehicleSignal = async (
  vehicleId: string
): Promise<{ status: VehicleSignalStatus; reason?: OfflineReason }> => {
  const key = statusKeyOf(vehicleId);
  const raw = await redisClient.hgetall(key);
  if (!raw || !raw.lastSeen) return { status: "ACTIVE" };

  const lastSeen = Number(raw.lastSeen) || 0;
  const now = Date.now();
  const silenceMs = now - lastSeen;

  const tripId = raw.tripId;
  if (tripId) {
    const trip = await Trip.findById(tripId).select("status").lean().catch(() => null);
    if (trip && trip.status === "PAUSED") {
      if (raw.offlineSince || raw.staleSince) {
        await redisClient.hdel(key, "offlineSince", "staleSince", "offlineEmitted");
      }
      return { status: "ACTIVE" };
    }
  }

  const settings = await getTrackingSettings();
  const staleTimeoutMs = settings.offlineStaleTimeoutSeconds * 1000;
  const offlineTimeoutMs = settings.offlineTimeoutSeconds * 1000;

  if (silenceMs < staleTimeoutMs) {
    if (raw.offlineSince || raw.staleSince) {
      await redisClient.hdel(key, "offlineSince", "staleSince", "offlineEmitted");
      logger.info(`Vehicle ${vehicleId} reconnected`, { vehicleId });
    }
    return { status: "ACTIVE" };
  }

  if (silenceMs < offlineTimeoutMs) {
    if (!raw.staleSince) {
      await redisClient.hset(key, { staleSince: String(now) });
    }
    logger.warn(`Vehicle ${vehicleId} is STALE (no signal for ${Math.round(silenceMs / 1000)}s)`, {
      vehicleId,
      silenceSeconds: Math.round(silenceMs / 1000),
    });
    return { status: "STALE", reason: "STALE_GPS" };
  }

  // Past the long timeout: OFFLINE — emit the incident-triggering event once.
  if (!raw.offlineSince) {
    await redisClient.hset(key, { offlineSince: String(now), status: "OFFLINE" });
  }

  if (raw.offlineEmitted !== "1") {
    await redisClient.hset(key, { offlineEmitted: "1" });

    const locRaw = await redisClient.get(`vehicle:${vehicleId}:location`);
    let lastKnownLocation = { lat: 0, lng: 0 };
    if (locRaw) {
      try {
        const loc = JSON.parse(locRaw) as { lat: number; lon: number };
        lastKnownLocation = { lat: loc.lat, lng: loc.lon };
      } catch {
        /* keep default */
      }
    }

    logger.error(`Vehicle ${vehicleId} is OFFLINE (no signal for ${Math.round(silenceMs / 1000)}s)`, {
      vehicleId,
      silenceSeconds: Math.round(silenceMs / 1000),
    });

    await publishEvent("VEHICLE_OFFLINE", {
      vehicleId,
      tripId: tripId || "",
      routeId: raw.routeId || "",
      driverId: raw.driverId || "",
      lastSeenTimestamp: lastSeen,
      offlineSince: now,
      reason: "GPS_OFFLINE",
      lastKnownLocation,
      timestamp: now,
    });

    if (raw.routeId) {
      await removeRouteVehicle(raw.routeId, vehicleId);
    }
  }

  return { status: "OFFLINE", reason: "GPS_OFFLINE" };
};

/** Single-vehicle on-demand check (used by read APIs / immediate checks). */
export const checkVehicleOffline = evaluateVehicleSignal;

/** P2-28 — scheduled sweep across every tracked vehicle; safe to run from the worker process. */
export const sweepOfflineVehicles = async (): Promise<{ checked: number; stale: number; offline: number }> => {
  const keys = await redisClient.keys("vehicle:*:status");
  let stale = 0;
  let offline = 0;

  for (const key of keys) {
    const vehicleId = vehicleIdFromKey(key);
    if (!vehicleId) continue;
    const result = await evaluateVehicleSignal(vehicleId);
    if (result.status === "STALE") stale++;
    if (result.status === "OFFLINE") offline++;
  }

  return { checked: keys.length, stale, offline };
};
