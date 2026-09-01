import { Types } from "mongoose";
import { Incident, IIncident, IncidentStatus, IncidentType, IncidentSource } from "./incident.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { broadcastToTrip, broadcastToVehicle, broadcastToFleetAll } from "../../config/socket.js";

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });
const oid = (v?: string | null): Types.ObjectId | null | undefined =>
  v === undefined || v === null || v === "" ? undefined : new Types.ObjectId(v);

/** Severity derived from the incident source/type at creation time. */
export const deriveSeverity = (source: IncidentSource, type?: string): IIncident["severity"] => {
  if (source === "DRIVER_SOS" || type === "accident") return "CRITICAL";
  if (source === "VEHICLE_OFFLINE" || type === "breakdown") return "HIGH";
  if (type === "traffic") return "MEDIUM";
  if (type === "route issue") return "MEDIUM";
  return "LOW";
};

const SEVERITY_RANK: Record<IIncident["severity"], number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const STATUS_ORDER: IIncident["status"][] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const mustBeInStatus = (incident: IIncident, allowed: IIncident["status"][], verb: string): void => {
  if (!allowed.includes(incident.status)) {
    throw AppError.conflict(`Cannot ${verb} an incident in status ${incident.status}`, "INVALID_INCIDENT_STATUS");
  }
};

const pushTimeline = (
  incident: IIncident & { timeline: IIncident["timeline"] },
  status: IIncident["status"],
  by: string | null,
  note?: string | null
): void => {
  incident.timeline = incident.timeline ?? [];
  incident.timeline.push({ at: new Date(), status, by, note: note ?? null });
};

/**
 * P1-49 — emit the `sos:acknowledged` handshake for Person 2's dispatch path.
 * Delivered to the vehicle + trip rooms and the fleet room; a fire-and-forget
 * socket broadcast (best-effort when no socket server is running, e.g. tests).
 */
export const emitIncidentAcknowledged = (incident: IIncident): void => {
  const inc = incident as IIncident & { _id: unknown };
  const data = {
    incidentId: (inc._id as Types.ObjectId)?.toString?.(),
    incidentType: incident.type,
    vehicleId: incident.vehicleId?.toString() ?? null,
    tripId: incident.tripId?.toString() ?? null,
    acknowledgedAt: incident.acknowledgedAt ?? new Date(),
  };
  if (incident.tripId) broadcastToTrip(incident.tripId.toString(), "sos:acknowledged", data);
  if (incident.vehicleId) broadcastToVehicle(incident.vehicleId.toString(), "sos:acknowledged", data);
  broadcastToFleetAll("sos:acknowledged", data);
};

// ---------------------------------------------------------------------------
// Queries / CRUD
// ---------------------------------------------------------------------------

export const listIncidents = async (input: {
  page: number;
  limit: number;
  status?: string;
  type?: string;
  source?: string;
  assignedToMe?: boolean;
  assigneeId?: string;
  search?: string;
}): Promise<unknown> => {
  const { page, limit } = input;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.status) filter.status = input.status;
  if (input.type) filter.type = input.type;
  if (input.source) filter.source = input.source;
  if (input.assignedToMe && input.assigneeId) filter.assignedTo = new Types.ObjectId(input.assigneeId);
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: q }, { description: q }];
  }

  const total = await Incident.countDocuments(filter);
  const docs = await Incident.find(filter)
    .populate("vehicleId", "registrationNumber")
    .populate("tripId", "status route")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { incidents: docs.map((d) => serializeIncident(d, true)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const getIncidentById = async (id: string): Promise<unknown> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null })
    .populate("vehicleId", "registrationNumber")
    .populate("tripId", "status route")
    .populate("assignedTo", "name email")
    .lean();
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  return serializeIncident(doc, true);
};

export type IncidentInput = {
  type: IncidentType;
  title: string;
  description?: string | null;
  severity?: IIncident["severity"];
  vehicleId?: string | null;
  tripId?: string | null;
  routeId?: string | null;
  driverId?: string | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
};

export const createIncident = async (input: IncidentInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const severity = input.severity ?? deriveSeverity("MANUAL", input.type);
  const doc = await Incident.create({
    type: input.type,
    status: "OPEN",
    severity,
    source: "MANUAL",
    vehicleId: oid(input.vehicleId) ?? null,
    tripId: oid(input.tripId) ?? null,
    routeId: oid(input.routeId) ?? null,
    driverId: oid(input.driverId) ?? null,
    location: input.location ?? null,
    title: input.title,
    description: input.description ?? null,
    timeline: [{ status: "OPEN", by: a?.id ?? null, note: "Incident created" }],
  });

  await AuditLog.create({
    ...actor(a),
    action: "incident.create",
    resource: "incident",
    resourceId: doc._id.toString(),
    meta: { type: doc.type, severity: doc.severity, source: doc.source },
    severity: "WARN",
  });

  return serializeIncident(doc.toObject());
};

export const updateIncident = async (id: string, input: Partial<Omit<IncidentInput, "type">>, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  if (input.title !== undefined) doc.title = input.title;
  if (input.description !== undefined) doc.description = input.description;
  if (input.severity !== undefined) doc.severity = input.severity;
  if (input.vehicleId !== undefined) doc.vehicleId = oid(input.vehicleId) ?? null;
  if (input.tripId !== undefined) doc.tripId = oid(input.tripId) ?? null;
  if (input.routeId !== undefined) doc.routeId = oid(input.routeId) ?? null;
  if (input.driverId !== undefined) doc.driverId = oid(input.driverId) ?? null;
  if (input.location !== undefined) doc.location = input.location ?? null;
  await doc.save();
  await AuditLog.create({
    ...actor(a), action: "incident.update", resource: "incident", resourceId: id,
    meta: { fields: Object.keys(input) }, severity: "INFO",
  });
  return serializeIncident(doc.toObject());
};

export const removeIncident = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({ ...actor(a), action: "incident.delete", resource: "incident", resourceId: id, severity: "WARN" });
};

// ---------------------------------------------------------------------------
// Workflow (state machine)
// ---------------------------------------------------------------------------

export const acknowledgeIncident = async (id: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  mustBeInStatus(doc, ["OPEN", "IN_PROGRESS"], "acknowledge");
  if (doc.status === "OPEN") {
    doc.status = "ACKNOWLEDGED";
    doc.acknowledgedBy = a?.id ? new Types.ObjectId(a.id) : null;
    doc.acknowledgedAt = new Date();
    pushTimeline(doc, "ACKNOWLEDGED", a?.id ?? null, "Incident acknowledged");
    await doc.save();
  }
  await AuditLog.create({ ...actor(a), action: "incident.acknowledge", resource: "incident", resourceId: id, meta: { status: doc.status }, severity: "WARN" });
  emitIncidentAcknowledged(doc);
  return serializeIncident(doc.toObject());
};

export const assignIncident = async (id: string, assignedTo: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  mustBeInStatus(doc, ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"], "assign");
  doc.assignedTo = new Types.ObjectId(assignedTo);
  doc.assignedAt = new Date();
  if (doc.status === "OPEN") {
    doc.status = "ACKNOWLEDGED";
  }
  if (doc.status !== "IN_PROGRESS") {
    doc.status = "IN_PROGRESS";
    pushTimeline(doc, "IN_PROGRESS", a?.id ?? null, `Assigned to ${assignedTo}`);
  }
  await doc.save();
  await AuditLog.create({ ...actor(a), action: "incident.assign", resource: "incident", resourceId: id, meta: { assignedTo }, severity: "WARN" });
  return serializeIncident(doc.toObject());
};

export const resolveIncident = async (id: string, note?: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  mustBeInStatus(doc, ["ACKNOWLEDGED", "IN_PROGRESS"], "resolve");
  doc.status = "RESOLVED";
  doc.resolvedBy = a?.id ? new Types.ObjectId(a.id) : null;
  doc.resolvedAt = new Date();
  pushTimeline(doc, "RESOLVED", a?.id ?? null, note ?? "Incident resolved");
  await doc.save();
  await AuditLog.create({ ...actor(a), action: "incident.resolve", resource: "incident", resourceId: id, meta: { note }, severity: "INFO" });
  return serializeIncident(doc.toObject());
};

export const closeIncident = async (id: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Incident.findOne({ _id: id, deletedAt: null });
  if (!doc) throw AppError.notFound("Incident not found", "INCIDENT_NOT_FOUND");
  mustBeInStatus(doc, ["RESOLVED"], "close");
  doc.status = "CLOSED";
  doc.closedBy = a?.id ? new Types.ObjectId(a.id) : null;
  doc.closedAt = new Date();
  pushTimeline(doc, "CLOSED", a?.id ?? null, "Incident closed");
  await doc.save();
  await AuditLog.create({ ...actor(a), action: "incident.close", resource: "incident", resourceId: id, severity: "INFO" });
  return serializeIncident(doc.toObject());
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serializeIncident = (d: any, full = false): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    _id: (d._id as unknown as Types.ObjectId)?.toString?.(),
    type: d.type,
    status: d.status,
    severity: d.severity,
    source: d.source,
    signalTraceId: d.signalTraceId ?? null,
    title: d.title,
    description: d.description ?? null,
    vehicleId: (d.vehicleId as unknown as Types.ObjectId)?.toString?.() ?? (d.vehicleId?._id?.toString?.() ?? null),
    tripId: (d.tripId as unknown as Types.ObjectId)?.toString?.() ?? null,
    routeId: (d.routeId as unknown as Types.ObjectId)?.toString?.() ?? null,
    driverId: (d.driverId as unknown as Types.ObjectId)?.toString?.() ?? null,
    location: d.location ?? null,
    acknowledgedAt: d.acknowledgedAt ?? null,
    assignedAt: d.assignedAt ?? null,
    resolvedAt: d.resolvedAt ?? null,
    closedAt: d.closedAt ?? null,
    timeline: (d.timeline ?? []).map((t: Record<string, unknown>) => ({ at: t.at, status: t.status, by: t.by, note: t.note })),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  if (full) {
    // reflect resolved assigned/acknowledged/resolved/closed actor ids too
    out.acknowledgedBy = (d.acknowledgedBy as unknown as Types.ObjectId)?.toString?.() ?? null;
    out.assignedTo = (d.assignedTo as unknown as Types.ObjectId)?.toString?.() ?? (d.assignedTo?.name ?? null);
    out.resolvedBy = (d.resolvedBy as unknown as Types.ObjectId)?.toString?.() ?? null;
    out.closedBy = (d.closedBy as unknown as Types.ObjectId)?.toString?.() ?? null;
    out.vehicle = d.vehicleId && typeof d.vehicleId === "object" && d.vehicleId.registrationNumber
      ? { _id: d.vehicleId._id.toString(), registrationNumber: d.vehicleId.registrationNumber }
      : null;
  }
  return out;
};

export type { IIncident, IncidentStatus };
export { STATUS_ORDER, SEVERITY_RANK };
