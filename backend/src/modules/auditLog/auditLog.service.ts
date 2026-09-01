import { Types } from "mongoose";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

export interface AuditLogFilter {
  actorId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  severity?: string;
  from?: number;
  to?: number;
  page?: number;
  limit?: number;
}

const serialize = (d: Record<string, unknown>) => ({
  id: (d._id as Types.ObjectId).toString(),
  actorId: (d.actorId as Types.ObjectId | null)?.toString?.() ?? null,
  actorRole: (d.actorRole as string | null) ?? null,
  action: d.action as string,
  resource: (d.resource as string) ?? "",
  resourceId: (d.resourceId as string | null) ?? null,
  meta: d.meta ?? {},
  ip: (d.ip as string) ?? "",
  userAgent: (d.userAgent as string) ?? "",
  severity: d.severity as string,
  createdAt: (d.createdAt as Date).toISOString(),
  updatedAt: (d.updatedAt as Date).toISOString(),
});

/** Audit logs are immutable — only read/filter endpoints are exposed. */
export const listAuditLogs = async (f: AuditLogFilter) => {
  const page = Number(f.page ?? 1);
  const limit = Math.min(Number(f.limit ?? 20), 100);
  const filter: Record<string, unknown> = {};

  if (f.actorId) filter.actorId = new Types.ObjectId(f.actorId);
  if (f.action) filter.action = f.action;
  if (f.resource) filter.resource = f.resource;
  if (f.resourceId) filter.resourceId = f.resourceId;
  if (f.severity) filter.severity = f.severity;
  if (typeof f.from === "number" || typeof f.to === "number") {
    const createdAt: Record<string, unknown> = {};
    if (typeof f.from === "number") createdAt.$gte = new Date(f.from);
    if (typeof f.to === "number") createdAt.$lte = new Date(f.to);
    filter.createdAt = createdAt;
  }

  const total = await AuditLog.countDocuments(filter);
  const docs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return {
    logs: docs.map((d) => serialize(d as unknown as Record<string, unknown>)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getAuditLog = async (id: string) => {
  const doc = await AuditLog.findById(id).lean();
  if (!doc) throw AppError.notFound("Audit log not found", "AUDIT_LOG_NOT_FOUND");
  return serialize(doc as unknown as Record<string, unknown>);
};