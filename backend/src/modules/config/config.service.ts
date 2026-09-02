import { SystemSetting } from "../../models/systemSetting.model.js";

const DEFAULTS: Record<string, unknown> = {
  gpsSendIntervalSeconds: 7,
  geofenceRadiusMeters: 100,
  etaThresholds: { low: 5, medium: 15, high: 30 },
  delayThresholds: { onTime: 0, delayed: 5, severe: 15 },
  mapTileSource: "openstreetmap",
  supportedLanguages: ["en"],
  minSupportedAppVersion: "1.0.0",
  featureFlags: {},
  // Falls back to the VAPID_PUBLIC_KEY env var so Web Push can be enabled
  // without a DB write; a `vapidPublicKey` SystemSetting still overrides it.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
};

async function readSettings(): Promise<Record<string, unknown>> {
  const docs = await SystemSetting.find({}).lean();
  const out: Record<string, unknown> = { ...DEFAULTS };
  for (const d of docs) {
    // An empty stored value shouldn't clobber a non-empty default (e.g. a
    // seeded `vapidPublicKey: ""` row must not hide the env-provided key).
    if (d.value === "" && out[d.key as string]) continue;
    out[d.key as string] = d.value;
  }
  return out;
}

/**
 * Role-filtered client bootstrap payload.
 * - staff/admin get the full set (ETA/delay thresholds, feature flags, maps).
 * - guests/passengers also receive public tuning values needed for live views.
 */
export const getClientConfig = async (role?: string): Promise<Record<string, unknown>> => {
  const settings = await readSettings();

  const base = {
    gpsSendIntervalSeconds: settings.gpsSendIntervalSeconds,
    geofenceRadiusMeters: settings.geofenceRadiusMeters,
    etaThresholds: settings.etaThresholds,
    delayThresholds: settings.delayThresholds,
    mapTileSource: settings.mapTileSource,
    supportedLanguages: settings.supportedLanguages,
    minSupportedAppVersion: settings.minSupportedAppVersion,
    featureFlags: settings.featureFlags,
    vapidPublicKey: settings.vapidPublicKey,
    serverTime: Date.now(),
  };

  // Guests get the same public payload — nothing sensitive is exposed here.
  return base;
};

export const getServerTime = (): { serverTime: number } => ({ serverTime: Date.now() });
