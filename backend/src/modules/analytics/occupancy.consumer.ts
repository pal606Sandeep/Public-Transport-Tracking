import { subscribeToEvent, type TrackingEvent } from "../tracking/event-bus.service.js";
import { OccupancyReading, type OccupancyLevel } from "./occupancy.model.js";
import { Trip } from "../trip/trip.model.js";
import { Types } from "mongoose";
import logger from "../../utils/logger.js";

/**
 * P1-47 — consume Person 2's `OCCUPANCY_CHANGED` events (P2-22 → P2-23 bus)
 * into persistent crowding history. Exported so it can be unit-tested without
 * going through Redis pub/sub; the event worker's at-least-once redelivery is
 * deduped by `eventTraceId` (unique sparse index).
 */
export const handleOccupancyEvent = async (event: TrackingEvent): Promise<{ stored: "new" | "duplicate"; trip: string }> => {
  const payload = event.payload as Record<string, unknown>;
  const tripId = payload.tripId as string | undefined;
  const vehicleId = payload.vehicleId as string | undefined;
  const routeId = payload.routeId as string | undefined;

  if (!tripId || !vehicleId || !routeId) {
    logger.warn("OCCUPANCY_CHANGED missing trip/vehicle/route", { traceId: event.traceId });
    return { stored: "duplicate", trip: "" };
  }

  const existing = event.traceId
    ? await OccupancyReading.findOne({ eventTraceId: event.traceId }).lean()
    : null;
  if (existing) return { stored: "duplicate", trip: existing.trip.toString() };

  try {
    const doc = await OccupancyReading.create({
      trip: new Types.ObjectId(tripId),
      vehicle: new Types.ObjectId(vehicleId),
      route: new Types.ObjectId(routeId),
      level: (payload.currentLevel as OccupancyLevel) ?? "LOW",
      passengerCount: Number(payload.passengerCount ?? 0),
      capacity: Number(payload.capacity ?? 0),
      occupancyPercentage: Number(payload.occupancyPercentage ?? 0),
      eventTraceId: event.traceId ?? null,
      occurredAt: payload.timestamp ? new Date(payload.timestamp as number) : new Date(),
    });
    logger.info(`Occupancy reading stored for trip ${tripId}`, { traceId: event.traceId });
    // Surface the latest occupancy onto the trip record too.
    const trip = await Trip.findById(tripId);
    if (trip) {
      if (!trip.passengerSummary) {
        trip.passengerSummary = { onBoard: 0, boarded: 0, alighted: 0, perStop: [], updatedAt: new Date() };
      }
      trip.passengerSummary.onBoard = Number(payload.passengerCount ?? 0);
      trip.passengerSummary.updatedAt = new Date();
      await trip.save();
    }
    return { stored: "new", trip: doc.trip.toString() };
  } catch (err) {
    // duplicate key race on eventTraceId → another copy already stored.
    if ((err as { code?: number }).code === 11000) {
      return { stored: "duplicate", trip: tripId };
    }
    throw err;
  }
};

let unsubscribe: (() => void) | null = null;

export const startOccupancyConsumer = (): void => {
  if (unsubscribe) return;
  unsubscribe = subscribeToEvent("OCCUPANCY_CHANGED", async (e) => {
    await handleOccupancyEvent(e).catch(() => undefined);
  });
  logger.info("OCCUPANCY_CHANGED consumer started");
};

export const stopOccupancyConsumer = (): void => {
  unsubscribe?.();
  unsubscribe = null;
  logger.info("OCCUPANCY_CHANGED consumer stopped");
};
