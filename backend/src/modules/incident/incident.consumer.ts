import { Types } from "mongoose";
import { subscribeToEvent, type TrackingEvent } from "../tracking/event-bus.service.js";
import { Incident, IIncident, IncidentType, IncidentSource } from "./incident.model.js";
import { deriveSeverity } from "./incident.service.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import logger from "../../utils/logger.js";

interface SignalMap {
  type: IncidentType;
  source: IncidentSource;
  title: (p: Record<string, unknown>) => string;
  description: (p: Record<string, unknown>) => string;
  /** Vehicle DB status to set within the same transaction (only when defined). */
  vehicleStatus?: "INACTIVE" | "MAINTENANCE";
  locationKey?: string;
}

const SIGNAL_MAP: Partial<Record<string, SignalMap>> = {
  DRIVER_SOS: {
    type: "accident",
    source: "DRIVER_SOS",
    title: () => "Driver SOS",
    description: (p) => `Emergency SOS raised${p.driverId ? ` by driver ${String(p.driverId)}` : ""}.`,
    vehicleStatus: "INACTIVE",
    locationKey: "location",
  },
  ROUTE_DEVIATION: {
    type: "route issue",
    source: "ROUTE_DEVIATION",
    title: () => "Route deviation",
    description: (p) =>
      `Vehicle deviated ${Number(p.deviationDistanceMeters ?? 0).toFixed(0)}m from its planned route.`,
    locationKey: "vehicleLocation",
  },
  GPS_FAILURE: {
    type: "other",
    source: "GPS_FAILURE",
    title: () => "GPS failure",
    description: (p) => `GPS signal lost on vehicle. Reason: ${String(p.reason ?? "unknown")}`,
    locationKey: "lastValidLocation",
  },
  VEHICLE_OFFLINE: {
    type: "breakdown",
    source: "VEHICLE_OFFLINE",
    title: () => "Vehicle offline",
    description: (p) => `Vehicle went offline${p.reason ? ` (${String(p.reason)})` : ""} at ${new Date(Number(p.offlineSince) || Date.now()).toISOString()}.`,
    vehicleStatus: "INACTIVE",
    locationKey: "lastKnownLocation",
  },
};

const toCoordinates = (p: Record<string, unknown>, key?: string): [number, number] | null => {
  if (!key) return null;
  const loc = p[key] as { lat?: number; lng?: number; latitude?: number; longitude?: number } | undefined;
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
};

/**
 * P1-49 — convert a Person 2 signal into an incident record. Incident creation
 * (+ any vehicle status change) happens in a single transaction. At-least-once
 * redelivery is deduped on (source, signalTraceId) via the partial unique index.
 */
export const handleIncidentSignal = async (
  event: TrackingEvent
): Promise<{ stored: "new" | "duplicate"; incident?: Record<string, unknown> }> => {
  const map = SIGNAL_MAP[event.eventType];
  if (!map) return { stored: "duplicate" }; // not an incident signal

  const payload = event.payload ?? {};
  const vehicleId = payload.vehicleId as string | undefined;
  const coordinates = toCoordinates(payload, map.locationKey);

  const session = await Incident.db.startSession();
  let result: { stored: "new" | "duplicate"; incident?: Record<string, unknown> };
  try {
    await session.withTransaction(async () => {
      const existing = await Incident.findOne({
        source: map.source,
        signalTraceId: event.traceId,
      }).session(session);
      if (existing) {
        result = { stored: "duplicate" };
        return;
      }

      const doc = await Incident.create(
        [
          {
            type: map.type,
            status: "OPEN",
            severity: deriveSeverity(map.source),
            source: map.source,
            signalTraceId: event.traceId,
            vehicleId: vehicleId ? new Types.ObjectId(vehicleId) : null,
            tripId: payload.tripId ? new Types.ObjectId(payload.tripId as string) : null,
            routeId: payload.routeId ? new Types.ObjectId(payload.routeId as string) : null,
            driverId: payload.driverId ? new Types.ObjectId(payload.driverId as string) : null,
            location: coordinates ? { type: "Point", coordinates } : null,
            title: map.title(payload),
            description: map.description(payload),
            timeline: [{ status: "OPEN", note: `Auto-created from ${map.source}` }],
          },
        ],
        { session }
      );
      const created = doc[0];

      if (map.vehicleStatus && vehicleId) {
        await Vehicle.updateOne({ _id: new Types.ObjectId(vehicleId) }, { $set: { status: map.vehicleStatus } }).session(session);
      }

      result = { stored: "new", incident: created.toObject() as unknown as Record<string, unknown> };
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      result = { stored: "duplicate" };
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  if (result!.stored === "new") {
    logger.info(`Incident created from ${event.eventType}`, { traceId: event.traceId, source: map.source });
  }
  return result!;
};

let unsubscriber: (() => void) | null = null;

export const startIncidentConsumer = (): void => {
  if (unsubscriber) return;
  unsubscriber = subscribeToEvent("all", async (e) => {
    await handleIncidentSignal(e).catch((err) => {
      logger.error(`Incident signal handling failed: ${(err as Error).message}`);
    });
  });
  logger.info("Incident event consumer started");
};

export const stopIncidentConsumer = (): void => {
  unsubscriber?.();
  unsubscriber = null;
};
