import { Types } from "mongoose";
import { ServiceAlert, IServiceAlert, IServiceAlertTargeting } from "./serviceAlert.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { Stop } from "../stop/stop.model.js";
import { Route } from "../route/route.model.js";
import { broadcastToRoute, broadcastToStop, broadcastToAll } from "../../config/socket.js";
import logger from "../../utils/logger.js";

export type TargetingInput =
  | { type: "routes"; routeIds: string[] }
  | { type: "stops"; stopIds: string[] }
  | { type: "geoArea"; geoArea: { type: "Polygon"; coordinates: number[][][] } }
  | { type: "all" };

export type ServiceAlertInput = {
  title: string;
  message: string;
  severity?: IServiceAlert["severity"];
  type: IServiceAlert["type"];
  targeting: TargetingInput;
  startsAt: Date;
  endsAt?: Date | null;
  status?: "DRAFT" | "PUBLISHED";
};

export type ServiceAlertUpdate = Partial<Omit<ServiceAlertInput, "status">>;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

/**
 * Turn admin-supplied targeting into concrete route/stop id lists so public
 * reads and socket fan-out never have to re-run a geo query per request.
 */
const resolveTargeting = async (
  targeting: TargetingInput
): Promise<{ routeIds: Types.ObjectId[]; stopIds: Types.ObjectId[] }> => {
  if (targeting.type === "routes") {
    return { routeIds: targeting.routeIds.map((id) => new Types.ObjectId(id)), stopIds: [] };
  }
  if (targeting.type === "stops") {
    return { routeIds: [], stopIds: targeting.stopIds.map((id) => new Types.ObjectId(id)) };
  }
  if (targeting.type === "geoArea") {
    const stops = await Stop.find({
      location: { $geoWithin: { $geometry: targeting.geoArea } },
      deletedAt: null,
    })
      .select("_id")
      .lean();
    const stopIds = stops.map((s) => s._id as Types.ObjectId);
    const routes = stopIds.length
      ? await Route.find({ stops: { $in: stopIds }, deletedAt: null }).select("_id").lean()
      : [];
    const routeIds = routes.map((r) => r._id as Types.ObjectId);
    return { routeIds, stopIds };
  }
  return { routeIds: [], stopIds: [] }; // "all" — matched by targeting.type, not resolved ids
};

const toTargetingDoc = (
  targeting: TargetingInput,
  resolved: { routeIds: Types.ObjectId[]; stopIds: Types.ObjectId[] }
): IServiceAlertTargeting => ({
  type: targeting.type,
  routeIds: targeting.type === "routes" ? resolved.routeIds : [],
  stopIds: targeting.type === "stops" ? resolved.stopIds : [],
  geoArea: targeting.type === "geoArea" ? targeting.geoArea : null,
});

const validateStopsExist = async (stopIds: Types.ObjectId[]): Promise<void> => {
  if (!stopIds.length) return;
  const count = await Stop.countDocuments({ _id: { $in: stopIds } });
  if (count !== stopIds.length) throw AppError.badRequest("One or more stopIds do not exist", "INVALID_STOP");
};

const validateRoutesExist = async (routeIds: Types.ObjectId[]): Promise<void> => {
  if (!routeIds.length) return;
  const count = await Route.countDocuments({ _id: { $in: routeIds } });
  if (count !== routeIds.length) throw AppError.badRequest("One or more routeIds do not exist", "INVALID_ROUTE");
};

/** P2-02 rooms: `route:{id}` / `stop:{id}`; "all" targeting goes to every connected socket. */
export const emitToRooms = (alert: Record<string, unknown>): void => {
  const targetingType = (alert.targeting as { type?: string } | undefined)?.type;
  const routeIds = (alert.resolvedRouteIds as unknown[]) ?? [];
  const stopIds = (alert.resolvedStopIds as unknown[]) ?? [];

  if (targetingType === "all") {
    broadcastToAll("service:alert", alert);
    logger.info("Service alert broadcast to all", { alertId: alert._id });
    return;
  }

  for (const routeId of routeIds) broadcastToRoute(String(routeId), "service:alert", alert);
  for (const stopId of stopIds) broadcastToStop(String(stopId), "service:alert", alert);

  logger.info("Service alert emitted to rooms", {
    alertId: alert._id,
    routes: routeIds.length,
    stops: stopIds.length,
  });
};

export const listServiceAlerts = async (input: {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  search?: string;
}): Promise<unknown> => {
  const { page, limit } = input;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.status) filter.status = input.status;
  if (input.type) filter.type = input.type;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: q }, { message: q }];
  }

  const total = await ServiceAlert.countDocuments(filter);
  const docs = await ServiceAlert.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    serviceAlerts: docs.map(serializeAlert),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getServiceAlertById = async (id: string): Promise<unknown> => {
  const doc = await ServiceAlert.findOne({ _id: id, deletedAt: null }).lean();
  if (!doc) throw AppError.notFound("Service alert not found", "SERVICE_ALERT_NOT_FOUND");
  return serializeAlert(doc);
};

export const createServiceAlert = async (
  input: ServiceAlertInput,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const resolved = await resolveTargeting(input.targeting);
  if (input.targeting.type === "routes") await validateRoutesExist(resolved.routeIds);
  if (input.targeting.type === "stops") await validateStopsExist(resolved.stopIds);

  const publishNow = input.status === "PUBLISHED";
  const doc = await ServiceAlert.create({
    title: input.title,
    message: input.message,
    severity: input.severity ?? "MEDIUM",
    type: input.type,
    targeting: toTargetingDoc(input.targeting, resolved),
    resolvedRouteIds: resolved.routeIds,
    resolvedStopIds: resolved.stopIds,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
    status: publishNow ? "PUBLISHED" : "DRAFT",
    publishedAt: publishNow ? new Date() : null,
  });

  await AuditLog.create({
    ...actor(a),
    action: "serviceAlert.create",
    resource: "serviceAlert",
    resourceId: doc._id.toString(),
    meta: { title: doc.title, status: doc.status },
    severity: "INFO",
  });

  const serialized = serializeAlert(doc.toObject());
  if (publishNow) emitToRooms(serialized as Record<string, unknown>);
  return serialized;
};

export const updateServiceAlert = async (
  id: string,
  input: ServiceAlertUpdate,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await ServiceAlert.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Service alert not found", "SERVICE_ALERT_NOT_FOUND");

  if (input.title !== undefined) doc.title = input.title;
  if (input.message !== undefined) doc.message = input.message;
  if (input.severity !== undefined) doc.severity = input.severity;
  if (input.type !== undefined) doc.type = input.type;
  if (input.startsAt !== undefined) doc.startsAt = input.startsAt;
  if (input.endsAt !== undefined) doc.endsAt = input.endsAt;

  if (input.targeting !== undefined) {
    const resolved = await resolveTargeting(input.targeting);
    if (input.targeting.type === "routes") await validateRoutesExist(resolved.routeIds);
    if (input.targeting.type === "stops") await validateStopsExist(resolved.stopIds);
    doc.targeting = toTargetingDoc(input.targeting, resolved);
    doc.resolvedRouteIds = resolved.routeIds;
    doc.resolvedStopIds = resolved.stopIds;
  }

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "serviceAlert.update",
    resource: "serviceAlert",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeAlert(doc.toObject());
};

export const publishServiceAlert = async (id: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await ServiceAlert.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Service alert not found", "SERVICE_ALERT_NOT_FOUND");
  if (doc.status !== "DRAFT") {
    throw AppError.conflict(`Cannot publish a ${doc.status.toLowerCase()} alert`, "INVALID_ALERT_STATUS");
  }

  doc.status = "PUBLISHED";
  doc.publishedAt = new Date();
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "serviceAlert.publish",
    resource: "serviceAlert",
    resourceId: id,
    meta: { title: doc.title },
    severity: "WARN",
  });

  const serialized = serializeAlert(doc.toObject());
  emitToRooms(serialized as Record<string, unknown>);
  return serialized;
};

export const cancelServiceAlert = async (id: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await ServiceAlert.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Service alert not found", "SERVICE_ALERT_NOT_FOUND");
  if (doc.status === "CANCELLED") throw AppError.conflict("Alert is already cancelled", "INVALID_ALERT_STATUS");

  const wasPublished = doc.status === "PUBLISHED";
  doc.status = "CANCELLED";
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "serviceAlert.cancel",
    resource: "serviceAlert",
    resourceId: id,
    severity: "WARN",
  });

  const serialized = serializeAlert(doc.toObject());
  if (wasPublished) emitToRooms(serialized as Record<string, unknown>);
  return serialized;
};

export const removeServiceAlert = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await ServiceAlert.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Service alert not found", "SERVICE_ALERT_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "serviceAlert.delete",
    resource: "serviceAlert",
    resourceId: id,
    severity: "WARN",
  });
};

export const publicListServiceAlerts = async (input: { routeId?: string; stopId?: string }): Promise<unknown> => {
  const now = new Date();
  const filter: Record<string, unknown> = {
    deletedAt: null,
    status: "PUBLISHED",
    startsAt: { $lte: now },
    $and: [] as Record<string, unknown>[],
  };
  filter.$and = [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }];

  if (input.routeId) {
    (filter.$and as Record<string, unknown>[]).push({
      $or: [{ "targeting.type": "all" }, { resolvedRouteIds: new Types.ObjectId(input.routeId) }],
    });
  }
  if (input.stopId) {
    (filter.$and as Record<string, unknown>[]).push({
      $or: [{ "targeting.type": "all" }, { resolvedStopIds: new Types.ObjectId(input.stopId) }],
    });
  }

  const docs = await ServiceAlert.find(filter).sort({ severity: -1, startsAt: -1 }).limit(200).lean();
  return { serviceAlerts: docs.map(serializeAlert) };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeAlert = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  title: d.title,
  message: d.message,
  severity: d.severity,
  type: d.type,
  targeting: {
    type: d.targeting?.type,
    routeIds: (d.targeting?.routeIds ?? []).map((id: unknown) => String(id)),
    stopIds: (d.targeting?.stopIds ?? []).map((id: unknown) => String(id)),
    geoArea: d.targeting?.geoArea ?? null,
  },
  resolvedRouteIds: (d.resolvedRouteIds ?? []).map((id: unknown) => String(id)),
  resolvedStopIds: (d.resolvedStopIds ?? []).map((id: unknown) => String(id)),
  startsAt: d.startsAt,
  endsAt: d.endsAt ?? null,
  status: d.status,
  publishedAt: d.publishedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { IServiceAlert };
