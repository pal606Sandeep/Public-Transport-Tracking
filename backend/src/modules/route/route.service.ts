import { Types } from "mongoose";
import { Route, IRoute } from "./route.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { Stop } from "../stop/stop.model.js";

export type StopEntryInput = { stopId: string; sequence: number; scheduledOffsetMinutes: number };

export type RouteInput = {
  routeNumber: string;
  name?: string | null;
  source?: string | null;
  destination?: string | null;
  distanceKm?: number | null;
  estimatedDurationMin?: number | null;
  geometry?: { type: "LineString"; coordinates: [number, number][] } | null;
  direction?: string | null;
  status?: IRoute["status"];
  orderedStops?: StopEntryInput[];
};

export type RouteUpdate = Partial<Omit<RouteInput, "orderedStops">>;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

export const listRoutes = async (input: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  includeDeleted?: boolean;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = {};
  if (!input.includeDeleted) filter.deletedAt = null;
  if (input.status) filter.status = input.status;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ routeNumber: q }, { name: q }];
  }

  const total = await Route.countDocuments(filter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: any[] = await Route.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();

  return {
    routes: docs.map((d) => serializeRoute(d)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getRouteById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = await Route.findOne(filter)
    .populate("source", "name code")
    .populate("destination", "name code")
    .populate("orderedStops.stopId", "name code")
    .populate("stops", "name code")
    .lean();
  if (!doc) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");
  return serializeRoute(doc);
};

export const createRoute = async (input: RouteInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const exists = await Route.findOne({ routeNumber: input.routeNumber });
  if (exists) throw AppError.conflict("Route number already in use", "ROUTE_NUMBER_IN_USE");

  const orderedStops = normalizeStops(input.orderedStops ?? []);
  const r: Record<string, unknown> = {
    routeNumber: input.routeNumber,
    name: input.name ?? null,
    source: input.source ? new Types.ObjectId(input.source) : null,
    destination: input.destination ? new Types.ObjectId(input.destination) : null,
    distanceKm: input.distanceKm ?? null,
    estimatedDurationMin: input.estimatedDurationMin ?? null,
    geometry: input.geometry ?? null,
    direction: input.direction ?? null,
    status: input.status ?? "ACTIVE",
    orderedStops,
    stops: orderedStops.map((s) => s.stopId),
  };
  const doc = await Route.create(r);

  await AuditLog.create({
    ...actor(a),
    action: "route.create",
    resource: "route",
    resourceId: doc._id.toString(),
    meta: { routeNumber: doc.routeNumber },
    severity: "WARN",
  });

  return serializeRoute(doc.toObject());
};

export const updateRoute = async (id: string, input: RouteUpdate, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Route.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");

  if (input.routeNumber && input.routeNumber !== doc.routeNumber) {
    const clash = await Route.findOne({ routeNumber: input.routeNumber });
    if (clash) throw AppError.conflict("Route number already in use", "ROUTE_NUMBER_IN_USE");
    doc.routeNumber = input.routeNumber;
  }
  if (input.name !== undefined) doc.name = input.name;
  if (input.source !== undefined) doc.source = input.source ? new Types.ObjectId(input.source) : null;
  if (input.destination !== undefined) doc.destination = input.destination ? new Types.ObjectId(input.destination) : null;
  if (input.distanceKm !== undefined) doc.distanceKm = input.distanceKm;
  if (input.estimatedDurationMin !== undefined) doc.estimatedDurationMin = input.estimatedDurationMin;
  if (input.geometry !== undefined) doc.geometry = input.geometry;
  if (input.direction !== undefined) doc.direction = input.direction;
  if (input.status !== undefined) doc.status = input.status;

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "route.update",
    resource: "route",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeRoute(doc.toObject());
};

export const setRouteStatus = async (id: string, status: IRoute["status"], a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Route.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");
  doc.status = status;
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: `route.${status === "ACTIVE" ? "activate" : "deactivate"}`,
    resource: "route",
    resourceId: id,
    severity: "INFO",
  });
  return serializeRoute(doc.toObject());
};

const renumber = (stops: StopEntryInput[]): StopEntryInput[] =>
  stops.map((s, i) => ({ ...s, sequence: i }));

const normalizeStops = (stops: StopEntryInput[]): StopEntryInput[] =>
  renumber(stops.sort((a, b) => a.sequence - b.sequence));

const validateStopsExist = async (stopIds: string[]): Promise<void> => {
  const ids = Array.from(new Set(stopIds));
  if (!ids.length) return;
  const count = await Stop.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) throw AppError.badRequest("One or more stopIds do not exist", "INVALID_STOP");
};

export const addRouteStop = async (
  id: string,
  input: StopEntryInput,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Route.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");
  if (doc.orderedStops.some((s) => s.stopId.toString() === input.stopId)) {
    throw AppError.conflict("Stop already present on route", "STOP_ALREADY_ON_ROUTE");
  }
  await validateStopsExist([input.stopId]);

  const entry: StopEntryInput = { stopId: input.stopId, sequence: input.sequence, scheduledOffsetMinutes: input.scheduledOffsetMinutes };
  const stops = [...doc.orderedStops.map((s) => ({ stopId: s.stopId.toString(), sequence: s.sequence, scheduledOffsetMinutes: s.scheduledOffsetMinutes })), entry];
  const normalized = normalizeStops(stops);
  doc.orderedStops = normalized.map((s) => ({ stopId: new Types.ObjectId(s.stopId), sequence: s.sequence, scheduledOffsetMinutes: s.scheduledOffsetMinutes })) as never;
  doc.stops = normalized.map((s) => new Types.ObjectId(s.stopId));
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "route.addStop",
    resource: "route",
    resourceId: id,
    meta: { stopId: input.stopId },
    severity: "INFO",
  });

  return serializeRoute(doc.toObject());
};

export const removeRouteStop = async (id: string, stopId: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Route.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");

  const stops = doc.orderedStops
    .filter((s) => s.stopId.toString() !== stopId)
    .map((s) => ({ stopId: s.stopId.toString(), sequence: s.sequence, scheduledOffsetMinutes: s.scheduledOffsetMinutes }));
  const normalized = normalizeStops(stops);
  doc.orderedStops = normalized.map((s) => ({ stopId: new Types.ObjectId(s.stopId), sequence: s.sequence, scheduledOffsetMinutes: s.scheduledOffsetMinutes })) as never;
  doc.stops = normalized.map((s) => new Types.ObjectId(s.stopId));
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "route.removeStop",
    resource: "route",
    resourceId: id,
    meta: { stopId },
    severity: "WARN",
  });

  return serializeRoute(doc.toObject());
};

export const reorderRouteStops = async (
  id: string,
  input: { stopIds: string[] },
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Route.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");

  const current = new Map(doc.orderedStops.map((s) => [s.stopId.toString(), s.scheduledOffsetMinutes]));
  if (input.stopIds.length !== doc.orderedStops.length || new Set(input.stopIds).size !== input.stopIds.length) {
    throw AppError.badRequest("stopIds must be a permutation of the route's current stops", "INVALID_ORDER");
  }

  const normalized: StopEntryInput[] = input.stopIds.map((stopId, i) => ({
    stopId,
    sequence: i,
    scheduledOffsetMinutes: current.get(stopId) ?? 0,
  }));
  doc.orderedStops = normalized.map((s) => ({ stopId: new Types.ObjectId(s.stopId), sequence: s.sequence, scheduledOffsetMinutes: s.scheduledOffsetMinutes })) as never;
  doc.stops = normalized.map((s) => new Types.ObjectId(s.stopId));
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "route.reorder",
    resource: "route",
    resourceId: id,
    severity: "INFO",
  });

  return serializeRoute(doc.toObject());
};

export const removeRoute = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Route.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "route.delete",
    resource: "route",
    resourceId: id,
    severity: "WARN",
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeRoute = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  routeNumber: d.routeNumber,
  name: d.name ?? null,
  source: d.source?._id?.toString?.() ?? d.source?.toString?.() ?? d.source ?? null,
  destination: d.destination?._id?.toString?.() ?? d.destination?.toString?.() ?? d.destination ?? null,
  distanceKm: d.distanceKm ?? null,
  estimatedDurationMin: d.estimatedDurationMin ?? null,
  geometry: d.geometry ?? null,
  direction: d.direction ?? null,
  status: d.status ?? "ACTIVE",
  orderedStops: (d.orderedStops ?? []).map((s: Record<string, unknown>) => ({
    stopId: (s.stopId as { _id?: unknown })?._id?.toString?.() ?? (s.stopId as { toString?: () => string })?.toString?.() ?? s.stopId,
    sequence: s.sequence,
    scheduledOffsetMinutes: s.scheduledOffsetMinutes ?? 0,
  })),
  stops: (d.stops ?? []).map((s: { _id?: unknown }) => s._id?.toString?.() ?? (s as { toString?: () => string })?.toString?.() ?? s),
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { IRoute };
