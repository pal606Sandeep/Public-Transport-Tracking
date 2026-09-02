import type { AppDispatch } from "@/store";
import {
  vehicleUpserted,
  type LiveVehicle,
} from "@/store/slices/liveVehicles.slice";

/** Server → client event names emitted by the backend tracking engine. */
export const RT_EVENTS = [
  "vehicle:location",
  "vehicle:status",
  "vehicle:delay",
  "vehicle:occupancy",
  "vehicle:approaching",
  "vehicle:arriving",
  "vehicle:arrived",
  "vehicle:left",
] as const;
export type RtEvent = (typeof RT_EVENTS)[number];

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : undefined;
};

/**
 * Fold one realtime event payload into a LiveVehicle patch. Handles both the
 * socket shape (`latitude`/`longitude`) and any REST-ish shape (`lat`/`lon`).
 */
export function toVehiclePatch(
  event: RtEvent,
  raw: Record<string, unknown>
): (Partial<LiveVehicle> & { vehicleId: string }) | null {
  const vehicleId =
    (raw.vehicleId as string) || (raw.vehicle as string) || "";
  if (!vehicleId) return null;

  const lat = num(raw.latitude) ?? num(raw.lat);
  const lng = num(raw.longitude) ?? num(raw.lon) ?? num(raw.lng);

  const patch: Partial<LiveVehicle> & { vehicleId: string } = {
    vehicleId,
    updatedAt: num(raw.timestamp) ?? num(raw.lastUpdate) ?? Date.now(),
  };
  if (lat != null) patch.lat = lat;
  if (lng != null) patch.lng = lng;
  if (raw.speed != null) patch.speed = num(raw.speed);
  if (raw.heading != null) patch.heading = num(raw.heading);
  if (raw.status != null) patch.status = String(raw.status);
  if (raw.routeId != null) patch.routeId = String(raw.routeId);
  if (raw.tripId != null) patch.tripId = String(raw.tripId);
  if (raw.currentStopId != null)
    patch.currentStopId = String(raw.currentStopId);
  if (raw.nextStopId != null) patch.nextStopId = String(raw.nextStopId);
  if (raw.eta != null) patch.etaSeconds = num(raw.eta);
  if (raw.occupancyLevel != null)
    patch.occupancyLevel = String(raw.occupancyLevel);
  if (raw.delayStatus != null) patch.delayStatus = String(raw.delayStatus);

  return patch;
}

export function applyRtEvent(
  dispatch: AppDispatch,
  event: RtEvent,
  raw: unknown
): void {
  const patch = toVehiclePatch(event, (raw ?? {}) as Record<string, unknown>);
  if (patch) dispatch(vehicleUpserted(patch));
}
