import { SystemSetting } from "../../../models/systemSetting.model.js";
import { trackingConfig } from "../config/tracking.config.js";
import logger from "../../../utils/logger.js";

/**
 * P2-10/P2-12/P2-13/P2-15/P2-30 all tune behaviour from System Settings
 * (radius, thresholds, timeouts, retention) rather than hard-coded values.
 * Settings are polled from Mongo with a short in-memory cache — Redis is not
 * used here since these values change rarely and every tracking process
 * (API + worker) needs its own local read.
 */
export interface TrackingSettings {
  geofenceRadiusMeters: number;
  depotRadiusMeters: number;
  delayThresholds: { onTime: number; delayed: number; severe: number };
  deviationThresholdMeters: number;
  deviationDwellSeconds: number;
  offlineStaleTimeoutSeconds: number;
  offlineTimeoutSeconds: number;
  driverIdleTimeoutSeconds: number;
  gpsHistoryRetentionDays: number;
}

const CACHE_MS = 15_000;
let cached: { value: TrackingSettings; at: number } | null = null;

const defaults = (): TrackingSettings => ({
  geofenceRadiusMeters: trackingConfig.geofence.defaultRadiusMeters,
  depotRadiusMeters: trackingConfig.geofence.depotRadiusMeters,
  delayThresholds: { ...trackingConfig.delay.thresholds },
  deviationThresholdMeters: trackingConfig.deviation.thresholdMeters,
  deviationDwellSeconds: trackingConfig.deviation.dwellSeconds,
  offlineStaleTimeoutSeconds: trackingConfig.offline.staleTimeoutSeconds,
  offlineTimeoutSeconds: trackingConfig.offline.offlineTimeoutSeconds,
  driverIdleTimeoutSeconds: 120,
  gpsHistoryRetentionDays: 30,
});

export const getTrackingSettings = async (): Promise<TrackingSettings> => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const base = defaults();
  try {
    const docs = await SystemSetting.find({
      key: {
        $in: [
          "geofenceRadiusMeters",
          "depotRadiusMeters",
          "delayThresholds",
          "deviationThresholdMeters",
          "deviationDwellSeconds",
          "offlineStaleTimeoutSeconds",
          // P1-17/P1-53's documented key — see PERSON2_TASKS.md P2-15.
          "offlineVehicleTimeoutSeconds",
          "driverIdleTimeoutSeconds",
          "gpsHistoryRetentionDays",
        ],
      },
    }).lean();

    const byKey = new Map(docs.map((d) => [d.key as string, d.value]));

    if (byKey.has("geofenceRadiusMeters")) base.geofenceRadiusMeters = Number(byKey.get("geofenceRadiusMeters"));
    if (byKey.has("depotRadiusMeters")) base.depotRadiusMeters = Number(byKey.get("depotRadiusMeters"));
    if (byKey.has("deviationThresholdMeters")) base.deviationThresholdMeters = Number(byKey.get("deviationThresholdMeters"));
    if (byKey.has("deviationDwellSeconds")) base.deviationDwellSeconds = Number(byKey.get("deviationDwellSeconds"));
    if (byKey.has("offlineStaleTimeoutSeconds")) base.offlineStaleTimeoutSeconds = Number(byKey.get("offlineStaleTimeoutSeconds"));
    if (byKey.has("offlineVehicleTimeoutSeconds")) base.offlineTimeoutSeconds = Number(byKey.get("offlineVehicleTimeoutSeconds"));
    if (byKey.has("driverIdleTimeoutSeconds")) base.driverIdleTimeoutSeconds = Number(byKey.get("driverIdleTimeoutSeconds"));
    if (byKey.has("gpsHistoryRetentionDays")) base.gpsHistoryRetentionDays = Number(byKey.get("gpsHistoryRetentionDays"));

    // P1-17's `delayThresholds` (config.service.ts) is authored in MINUTES
    // for the client-facing /config payload; tracking's delay math runs in
    // seconds, so convert on the way in.
    const delayRaw = byKey.get("delayThresholds") as { onTime?: number; delayed?: number; severe?: number } | undefined;
    if (delayRaw) {
      base.delayThresholds = {
        onTime: Number(delayRaw.onTime ?? 0) * 60,
        delayed: Number(delayRaw.delayed ?? 5) * 60,
        severe: Number(delayRaw.severe ?? 15) * 60,
      };
    }
  } catch (err) {
    logger.warn(`Falling back to default tracking settings: ${(err as Error).message}`);
  }

  cached = { value: base, at: Date.now() };
  return base;
};

export const invalidateTrackingSettingsCache = (): void => {
  cached = null;
};
