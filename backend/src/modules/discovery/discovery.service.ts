import { Types } from "mongoose";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { Schedule } from "../schedule/schedule.model.js";
import { Trip } from "../trip/trip.model.js";
import { SystemSetting } from "../../models/systemSetting.model.js";
import { AppError } from "../../utils/AppError.js";
import redisClient from "../../config/redis.js";
import logger from "../../utils/logger.js";

const rx = (s: string): RegExp => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const DEFAULT_FARE = { baseFare: 10, perStopFare: 2 };
const WALK_SPEED_MPS = 1.3; // ~4.7 km/h

/* --------------------------------------------------------------------- *
 * P1-33 — search + details + find bus
 * --------------------------------------------------------------------- */

export const searchRoutes = async (input: {
  q?: string;
  status?: string;
  page: number;
  limit: number;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = { deletedAt: null };
  filter.status = input.status ?? "ACTIVE";
  if (input.q) {
    const q = rx(input.q);
    filter.$or = [{ routeNumber: q }, { name: q }, { direction: q }];
  }
  const total = await Route.countDocuments(filter);
  const docs = await Route.find(filter)
    .populate("source", "name code")
    .populate("destination", "name code")
    .sort({ routeNumber: 1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();

  return {
    routes: docs.map(serializeRouteBrief),
    pagination: paginate(input.page, input.limit, total),
  };
};

export const searchStops = async (input: {
  q?: string;
  lat?: number;
  lng?: number;
  radius: number;
  page: number;
  limit: number;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = { deletedAt: null, isActive: true };
  if (input.q) {
    const q = rx(input.q);
    filter.$or = [{ name: q }, { code: q }, { address: q }];
  }

  if (input.lat !== undefined && input.lng !== undefined) {
    const agg = await Stop.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [input.lng, input.lat] },
          distanceField: "distanceMeters",
          maxDistance: input.radius,
          query: filter,
          spherical: true,
        },
      },
      { $skip: (input.page - 1) * input.limit },
      { $limit: input.limit },
    ]);
    return {
      stops: (agg as Record<string, unknown>[]).map(serializeStopBrief),
      pagination: paginate(input.page, input.limit, agg.length),
    };
  }

  const total = await Stop.countDocuments(filter);
  const docs = await Stop.find(filter)
    .sort({ name: 1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();
  return {
    stops: docs.map(serializeStopBrief),
    pagination: paginate(input.page, input.limit, total),
  };
};

/**
 * Routes that serve `fromStopId` and `toStopId` in that stop order (i.e. you can
 * board at `from` and alight at `to` without changing buses).
 */
export const findBus = async (input: {
  from: string;
  to: string;
  page: number;
  limit: number;
}): Promise<unknown> => {
  if (input.from === input.to)
    throw AppError.badRequest("from and to must differ", "SAME_STOP");

  const [fromStop, toStop] = await Promise.all([
    Stop.findById(input.from).lean(),
    Stop.findById(input.to).lean(),
  ]);
  if (!fromStop) throw AppError.notFound("Origin stop not found", "STOP_NOT_FOUND");
  if (!toStop) throw AppError.notFound("Destination stop not found", "STOP_NOT_FOUND");

  const routes = await Route.find({
    deletedAt: null,
    status: "ACTIVE",
    stops: { $all: [new Types.ObjectId(input.from), new Types.ObjectId(input.to)] },
  })
    .populate("orderedStops.stopId", "name code location")
    .lean();

  const matches = [];
  for (const r of routes) {
    const ordered = [...(r.orderedStops ?? [])].sort((a, b) => a.sequence - b.sequence);
    const fromIdx = ordered.findIndex((s) => idOf(s.stopId) === input.from);
    const toIdx = ordered.findIndex((s) => idOf(s.stopId) === input.to);
    if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) continue;

    const board = ordered[fromIdx];
    const alight = ordered[toIdx];
    matches.push({
      routeId: idOf(r._id),
      routeNumber: r.routeNumber,
      name: r.name ?? null,
      boardStop: briefStopEntry(board),
      alightStop: briefStopEntry(alight),
      intermediateStops: toIdx - fromIdx - 1,
      scheduledDurationMinutes: Math.max(
        0,
        (alight.scheduledOffsetMinutes ?? 0) - (board.scheduledOffsetMinutes ?? 0)
      ),
    });
  }

  matches.sort((a, b) => a.scheduledDurationMinutes - b.scheduledDurationMinutes);
  const start = (input.page - 1) * input.limit;
  return {
    from: serializeStopBrief(fromStop),
    to: serializeStopBrief(toStop),
    routes: matches.slice(start, start + input.limit),
    pagination: paginate(input.page, input.limit, matches.length),
  };
};

/* --------------------------------------------------------------------- *
 * P1-34 — journey planner
 * --------------------------------------------------------------------- */

interface ResolvedEndpoint {
  stop: Record<string, unknown>;
  walkingDistanceMeters: number;
}

export const planJourney = async (input: {
  from: string;
  to: string;
  time?: number;
  maxTransfers: number;
}): Promise<unknown> => {
  const at = input.time ?? Date.now();
  const [origin, dest] = await Promise.all([
    resolveEndpoint(input.from),
    resolveEndpoint(input.to),
  ]);
  if (idOf(origin.stop._id) === idOf(dest.stop._id))
    throw AppError.badRequest("Origin and destination resolve to the same stop", "SAME_STOP");

  const fare = await getFareRules();

  const originId = idOf(origin.stop._id);
  const destId = idOf(dest.stop._id);

  // Routes touching each endpoint (with ordered stops + sequence lookup).
  const [fromRoutes, toRoutes] = await Promise.all([
    routesServingStop(originId),
    routesServingStop(destId),
  ]);

  const options: JourneyOption[] = [];

  // --- Direct options (0 transfers) ---
  for (const r of fromRoutes) {
    const fromSeq = r.seq.get(originId);
    const toSeq = r.seq.get(destId);
    if (fromSeq === undefined || toSeq === undefined || fromSeq >= toSeq) continue;
    options.push(
      await buildOption([{ route: r, fromStopId: originId, toStopId: destId }], origin, dest, at, fare)
    );
  }

  // --- One-transfer options ---
  if (input.maxTransfers >= 1) {
    for (const a of fromRoutes) {
      const fromSeqA = a.seq.get(originId);
      if (fromSeqA === undefined) continue;
      for (const b of toRoutes) {
        if (a.routeId === b.routeId) continue;
        const toSeqB = b.seq.get(destId);
        if (toSeqB === undefined) continue;
        // shared transfer stop: reachable forward on A, and before dest on B
        for (const [stopId, seqA] of a.seq) {
          if (seqA <= fromSeqA) continue;
          const seqB = b.seq.get(stopId);
          if (seqB === undefined || seqB >= toSeqB) continue;
          options.push(
            await buildOption(
              [
                { route: a, fromStopId: originId, toStopId: stopId },
                { route: b, fromStopId: stopId, toStopId: destId },
              ],
              origin,
              dest,
              at,
              fare
            )
          );
          break; // first viable transfer stop on this pair is enough
        }
      }
    }
  }

  // Rank: fewer transfers first, then shorter total duration, then lower fare.
  options.sort(
    (x, y) =>
      x.transfers - y.transfers ||
      x.totalDurationMinutes - y.totalDurationMinutes ||
      x.totalFare - y.totalFare
  );

  // De-dupe identical leg signatures, cap the list.
  const seen = new Set<string>();
  const ranked = options
    .filter((o) => {
      const sig = o.legs.map((l) => `${l.mode}:${l.routeId ?? ""}:${l.fromStopId ?? ""}:${l.toStopId ?? ""}`).join("|");
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    })
    .slice(0, 10);

  return {
    query: {
      from: serializeStopBrief(origin.stop),
      to: serializeStopBrief(dest.stop),
      time: at,
    },
    walkingDistanceToFirstStopMeters: Math.round(origin.walkingDistanceMeters),
    options: ranked,
  };
};

/* --------------------------------------------------------------------- *
 * internals
 * --------------------------------------------------------------------- */

interface JourneyLeg {
  mode: "walk" | "ride";
  routeId?: string;
  routeNumber?: string;
  fromStopId?: string;
  toStopId?: string;
  fromStopName?: string;
  toStopName?: string;
  distanceMeters?: number;
  durationMinutes: number;
  fare: number;
  nextDeparture?: number | null;
  liveEtaSeconds?: number | null;
}

interface JourneyOption {
  transfers: number;
  legs: JourneyLeg[];
  transferPoints: Array<{ stopId: string; stopName: string | null }>;
  totalDurationMinutes: number;
  totalFare: number;
}

interface RouteWithSeq {
  routeId: string;
  routeNumber: string;
  name: string | null;
  ordered: Array<{ stopId: string; sequence: number; scheduledOffsetMinutes: number; name: string | null }>;
  seq: Map<string, number>;
  offset: Map<string, number>;
}

const resolveEndpoint = async (token: string): Promise<ResolvedEndpoint> => {
  if (/^[a-f\d]{24}$/i.test(token)) {
    const stop = await Stop.findOne({ _id: token, deletedAt: null }).lean();
    if (!stop) throw AppError.notFound("Stop not found", "STOP_NOT_FOUND");
    return { stop: stop as unknown as Record<string, unknown>, walkingDistanceMeters: 0 };
  }
  const [latS, lngS] = token.split(",").map((s) => s.trim());
  const lat = Number(latS);
  const lng = Number(lngS);
  const agg = await Stop.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: 5000,
        query: { deletedAt: null, isActive: true },
        spherical: true,
      },
    },
    { $limit: 1 },
  ]);
  if (!agg.length) throw AppError.notFound("No stop within 5km of that location", "NO_NEARBY_STOP");
  const stop = agg[0] as Record<string, unknown>;
  return { stop, walkingDistanceMeters: Number(stop.distanceMeters ?? 0) };
};

const routesServingStop = async (stopId: string): Promise<RouteWithSeq[]> => {
  const docs = await Route.find({
    deletedAt: null,
    status: "ACTIVE",
    stops: new Types.ObjectId(stopId),
  })
    .populate("orderedStops.stopId", "name code")
    .lean();

  return docs.map((r) => {
    const ordered = [...(r.orderedStops ?? [])]
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({
        stopId: idOf(s.stopId),
        sequence: s.sequence,
        scheduledOffsetMinutes: s.scheduledOffsetMinutes ?? 0,
        name: nameOf(s.stopId),
      }));
    return {
      routeId: idOf(r._id),
      routeNumber: r.routeNumber,
      name: r.name ?? null,
      ordered,
      seq: new Map(ordered.map((s) => [s.stopId, s.sequence])),
      offset: new Map(ordered.map((s) => [s.stopId, s.scheduledOffsetMinutes])),
    };
  });
};

const buildOption = async (
  hops: Array<{ route: RouteWithSeq; fromStopId: string; toStopId: string }>,
  origin: ResolvedEndpoint,
  dest: ResolvedEndpoint,
  at: number,
  fare: { baseFare: number; perStopFare: number }
): Promise<JourneyOption> => {
  const legs: JourneyLeg[] = [];
  const transferPoints: Array<{ stopId: string; stopName: string | null }> = [];

  // Leading walk to the first boarding stop (only when origin was a coordinate).
  if (origin.walkingDistanceMeters > 1) {
    legs.push({
      mode: "walk",
      distanceMeters: Math.round(origin.walkingDistanceMeters),
      durationMinutes: Math.max(1, Math.round(origin.walkingDistanceMeters / WALK_SPEED_MPS / 60)),
      fare: 0,
    });
  }

  for (let i = 0; i < hops.length; i++) {
    const { route, fromStopId, toStopId } = hops[i];
    const fromSeq = route.seq.get(fromStopId)!;
    const toSeq = route.seq.get(toStopId)!;
    const stopsSpanned = toSeq - fromSeq;
    const durationMinutes = Math.max(
      0,
      (route.offset.get(toStopId) ?? 0) - (route.offset.get(fromStopId) ?? 0)
    );
    const legFare = fare.baseFare + fare.perStopFare * stopsSpanned;

    const { nextDeparture, liveEtaSeconds } = await departureInfo(route.routeId, fromStopId, route, at);

    legs.push({
      mode: "ride",
      routeId: route.routeId,
      routeNumber: route.routeNumber,
      fromStopId,
      toStopId,
      fromStopName: route.ordered.find((s) => s.stopId === fromStopId)?.name ?? undefined,
      toStopName: route.ordered.find((s) => s.stopId === toStopId)?.name ?? undefined,
      durationMinutes,
      fare: legFare,
      nextDeparture,
      liveEtaSeconds,
    });

    if (i < hops.length - 1) {
      const tp = route.ordered.find((s) => s.stopId === toStopId);
      transferPoints.push({ stopId: toStopId, stopName: tp?.name ?? null });
    }
  }

  // Trailing walk if the destination was a coordinate.
  if (dest.walkingDistanceMeters > 1) {
    legs.push({
      mode: "walk",
      distanceMeters: Math.round(dest.walkingDistanceMeters),
      durationMinutes: Math.max(1, Math.round(dest.walkingDistanceMeters / WALK_SPEED_MPS / 60)),
      fare: 0,
    });
  }

  const totalDurationMinutes = legs.reduce((s, l) => s + l.durationMinutes, 0);
  const totalFare = legs.reduce((s, l) => s + l.fare, 0);

  return {
    transfers: hops.length - 1,
    legs,
    transferPoints,
    totalDurationMinutes,
    totalFare,
  };
};

/**
 * Next scheduled departure for a route from a given stop after `at`, plus a live
 * ETA (seconds) read from Redis `vehicle:{id}:eta` when a trip is currently
 * ACTIVE on the route (P2-12). Both are best-effort — falls back to schedule.
 */
const departureInfo = async (
  routeId: string,
  fromStopId: string,
  route: RouteWithSeq,
  at: number
): Promise<{ nextDeparture: number | null; liveEtaSeconds: number | null }> => {
  let nextDeparture: number | null = null;
  const offsetMin = route.offset.get(fromStopId) ?? 0;

  const schedules = await Schedule.find({ route: routeId, isActive: true, deletedAt: null }).lean();
  const base = new Date(at);
  const candidates: number[] = [];
  for (const s of schedules) {
    for (const t of s.departureTimes ?? []) {
      const m = /^(\d{1,2}):(\d{2})$/.exec(t);
      if (!m) continue;
      for (const dayShift of [0, 1]) {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + dayShift);
        d.setUTCHours(Number(m[1]), Number(m[2]), 0, 0);
        const depAtStop = d.getTime() + offsetMin * 60_000;
        if (depAtStop >= at) candidates.push(depAtStop);
      }
    }
  }
  if (candidates.length) nextDeparture = Math.min(...candidates);

  let liveEtaSeconds: number | null = null;
  try {
    const activeTrip = await Trip.findOne({ route: routeId, status: { $in: ["ACTIVE", "PAUSED"] } })
      .select("vehicle")
      .lean();
    if (activeTrip?.vehicle) {
      const raw = await redisClient.get(`vehicle:${activeTrip.vehicle.toString()}:eta`);
      if (raw) {
        const parsed = JSON.parse(raw) as { stops?: Record<string, { etaSeconds?: number }>; etaSeconds?: number };
        const perStop = parsed.stops?.[fromStopId]?.etaSeconds;
        liveEtaSeconds =
          typeof perStop === "number" ? perStop : typeof parsed.etaSeconds === "number" ? parsed.etaSeconds : null;
      }
    }
  } catch (err) {
    logger.warn(`journey live-ETA lookup failed for route ${routeId}: ${(err as Error).message}`);
  }

  return { nextDeparture, liveEtaSeconds };
};

const getFareRules = async (): Promise<{ baseFare: number; perStopFare: number }> => {
  const doc = await SystemSetting.findOne({ key: "fareRules" }).lean();
  const v = (doc?.value ?? {}) as { baseFare?: number; perStopFare?: number };
  return {
    baseFare: typeof v.baseFare === "number" ? v.baseFare : DEFAULT_FARE.baseFare,
    perStopFare: typeof v.perStopFare === "number" ? v.perStopFare : DEFAULT_FARE.perStopFare,
  };
};

const paginate = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idOf = (v: any): string =>
  v?._id?.toString?.() ?? v?.toString?.() ?? String(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nameOf = (v: any): string | null => (v && typeof v === "object" ? v.name ?? null : null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const briefStopEntry = (entry: any) => ({
  stopId: idOf(entry.stopId),
  name: nameOf(entry.stopId),
  code: entry.stopId && typeof entry.stopId === "object" ? entry.stopId.code ?? null : null,
  sequence: entry.sequence,
  scheduledOffsetMinutes: entry.scheduledOffsetMinutes ?? 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeRouteBrief = (d: any): Record<string, unknown> => ({
  _id: idOf(d._id),
  routeNumber: d.routeNumber,
  name: d.name ?? null,
  direction: d.direction ?? null,
  source: d.source ? { _id: idOf(d.source), name: d.source.name ?? null, code: d.source.code ?? null } : null,
  destination: d.destination
    ? { _id: idOf(d.destination), name: d.destination.name ?? null, code: d.destination.code ?? null }
    : null,
  distanceKm: d.distanceKm ?? null,
  estimatedDurationMin: d.estimatedDurationMin ?? null,
  stopCount: (d.stops ?? []).length,
  status: d.status ?? "ACTIVE",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeStopBrief = (d: any): Record<string, unknown> => ({
  _id: idOf(d._id),
  name: d.name,
  code: d.code ?? null,
  location: d.location
    ? { lng: d.location.coordinates?.[0] ?? null, lat: d.location.coordinates?.[1] ?? null }
    : null,
  address: d.address ?? null,
  distanceMeters: d.distanceMeters !== undefined ? Math.round(Number(d.distanceMeters)) : undefined,
});
