import { Types } from "mongoose";
import { Trip } from "./trip.model.js";
import { Route } from "../route/route.model.js";
import { IdempotencyKey } from "../../models/idempotencyKey.model.js";
import { AppError } from "../../utils/AppError.js";

export type PassengerCountItem = {
  idempotencyKey: string;
  stop?: string;
  boarded?: number;
  alighted?: number;
  recordedAt?: string;
};

export type ReconciliationInput = {
  ticketsIssued: number;
  cashCollected: number;
  digitalCollected: number;
};

export type BulkResult = {
  index: number;
  idempotencyKey: string;
  status: "created" | "replayed";
  recordedAt?: string | null;
  applied?: Record<string, unknown>;
  error?: { code: string; message: string } | null;
};

/**
 * Offline conductor sync — bulk passenger-count updates for a trip (P1-46).
 * Each item carries its own client Idempotency-Key. Entries are de-duplicated
 * per (conductor, trip, key), timestamp-validated, sorted by recordedAt, and
 * applied in order. Replayed keys return the stored per-item result instead of
 * double-counting.
 */
export const syncPassengerCountBulk = async (
  userId: string,
  tripId: string,
  items: PassengerCountItem[]
): Promise<unknown> => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");

  const route = trip.route ? await Route.findById(trip.route).lean() : null;
  const stopIds = new Set((route?.orderedStops ?? []).map((s: { stopId: unknown }) => String(s.stopId)));

  // Validate timestamps + basic shape up front; sort by recordedAt (ascending).
  const now = Date.now();
  const ordered = items.map((it, index) => ({ it, index })).sort((a, b) => {
    const ta = a.it.recordedAt ? new Date(a.it.recordedAt).getTime() : 0;
    const tb = b.it.recordedAt ? new Date(b.it.recordedAt).getTime() : 0;
    return ta - tb;
  });

  const summary = trip.passengerSummary
    ? { onBoard: trip.passengerSummary.onBoard, boarded: trip.passengerSummary.boarded, alighted: trip.passengerSummary.alighted, perStop: [...trip.passengerSummary.perStop] }
    : { onBoard: 0, boarded: 0, alighted: 0, perStop: [] as { stop?: string; boarded: number; alighted: number; onBoard: number }[] };

  const results: BulkResult[] = [];

  for (const { it, index } of ordered) {
    if (!it.idempotencyKey) {
      results.push({ index, idempotencyKey: it.idempotencyKey, status: "created", error: { code: "KEY_REQUIRED", message: "idempotencyKey is required per item" } });
      continue;
    }
    const key = `conductor:${userId}:passenger-count:${tripId}:${it.idempotencyKey}`;
    const existing = await IdempotencyKey.findOne({ key, scope: "conductor-passenger-count" });
    if (existing) {
      results.push({ ...(existing.body as BulkResult), status: "replayed" });
      continue;
    }

    const recordedAt = it.recordedAt ? new Date(it.recordedAt) : new Date();
    if (Number.isNaN(recordedAt.getTime()))
      throw AppError.badRequest(`Invalid recordedAt for item ${index}`, "INVALID_TIMESTAMP");
    const recordedMs = recordedAt.getTime();
    if (recordedMs > now + 60_000)
      throw AppError.badRequest(`recordedAt in the future for item ${index}`, "TIMESTAMP_IN_FUTURE");
    if (recordedMs < now - 7 * 24 * 60 * 60 * 1000)
      throw AppError.badRequest(`recordedAt too old for item ${index}`, "TIMESTAMP_TOO_OLD");

    const boarded = it.boarded ?? 0;
    const alighted = it.alighted ?? 0;
    if (boarded < 0 || alighted < 0)
      throw AppError.badRequest(`boarded/alighted cannot be negative for item ${index}`, "NEGATIVE_COUNT");

    const stopId = it.stop ? String(it.stop) : null;
    if (stopId && stopIds.size > 0 && !stopIds.has(stopId))
      throw AppError.badRequest(`Stop not on trip route for item ${index}`, "STOP_NOT_ON_ROUTE");

    const applied: Record<string, unknown> = {
      recordedAt: recordedAt.toISOString(),
      stop: stopId,
      boarded,
      alighted,
      onBoard: summary.onBoard + boarded - alighted,
    };
    summary.onBoard += boarded - alighted;
    summary.boarded += boarded;
    summary.alighted += alighted;

    if (stopId) {
      let perStop = summary.perStop.find((p) => p.stop && String(p.stop) === stopId);
      if (!perStop) {
        perStop = { stop: stopId, boarded: 0, alighted: 0, onBoard: 0 };
        summary.perStop.push(perStop as never);
      }
      perStop.boarded += boarded;
      perStop.alighted += alighted;
      perStop.onBoard += boarded - alighted;
    }

    const result: BulkResult = {
      index,
      idempotencyKey: it.idempotencyKey,
      status: "created",
      recordedAt: recordedAt.toISOString(),
      applied: { boarded, alighted, onBoard: summary.onBoard },
    };
    results.push(result);

    await IdempotencyKey.create({
      key,
      scope: "conductor-passenger-count",
      statusCode: 200,
      body: result,
    });
  }

  trip.passengerSummary = {
    onBoard: summary.onBoard,
    boarded: summary.boarded,
    alighted: summary.alighted,
    perStop: summary.perStop.map((p) => ({
      stop: p.stop ? new Types.ObjectId(String(p.stop)) : null,
      boarded: (p as { boarded: number }).boarded,
      alighted: (p as { alighted: number }).alighted,
      onBoard: (p as { onBoard: number }).onBoard,
    })),
    updatedAt: new Date(),
  };
  await trip.save();

  return {
    trip: tripId,
    results,
    summary: {
      onBoard: summary.onBoard,
      boarded: summary.boarded,
      alighted: summary.alighted,
      perStop: summary.perStop,
    },
  };
};

/**
 * Reconciliation (P1-46) — expected vs collected variance for a trip.
 * £expected = number of tickets issued; collected = cash + digital.
 * variance = collected - expected (negative → cash shortfall).
 */
export const reconcileTrip = async (
  tripId: string,
  input: ReconciliationInput
): Promise<unknown> => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");

  const expected = input.ticketsIssued;
  const collected = input.cashCollected + input.digitalCollected;
  const variance = collected - expected;

  const reconciledAt = new Date();
  trip.reconciliation = {
    expected,
    collected,
    variance,
    ticketsIssued: input.ticketsIssued,
    cashCollected: input.cashCollected,
    digitalCollected: input.digitalCollected,
    reconciledAt,
  };
  await trip.save();

  return {
    trip: tripId,
    expected,
    collected,
    variance,
    ticketsIssued: input.ticketsIssued,
    cashCollected: input.cashCollected,
    digitalCollected: input.digitalCollected,
    reconciledAt,
  };
};
