import { Types } from "mongoose";
import { Complaint, ComplaintStatus, IComplaint } from "./complaint.model.js";
import { User } from "../user/user.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { dispatchNotification } from "../notification/notification.service.js";
import logger from "../../utils/logger.js";

const oid = (v: string): Types.ObjectId => new Types.ObjectId(v);
const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

type A = { id?: string; role?: string } | undefined;

// Allowed status transitions.
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ["IN_PROGRESS", "ESCALATED", "CLOSED"],
  IN_PROGRESS: ["ESCALATED", "RESOLVED", "CLOSED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

const assertTransition = (from: ComplaintStatus, to: ComplaintStatus): void => {
  if (from === to) return;
  if (!TRANSITIONS[from].includes(to))
    throw AppError.conflict(`Cannot move complaint from ${from} to ${to}`, "INVALID_COMPLAINT_STATUS");
};

const push = (
  doc: IComplaint,
  action: string,
  a?: A,
  note?: string | null,
  meta?: Record<string, unknown> | null
): void => {
  doc.history.push({ action, by: a?.id ? oid(a.id) : null, at: new Date(), note: note ?? null, meta: meta ?? null });
};

/* ---------------- create / read ---------------- */

export const createComplaint = async (
  userId: string,
  input: {
    category: IComplaint["category"];
    subject: string;
    description: string;
    relatedTrip?: string | null;
    relatedRoute?: string | null;
    relatedVehicle?: string | null;
    attachmentKeys?: string[];
  },
  a?: A
): Promise<unknown> => {
  const doc = await Complaint.create({
    complainant: oid(userId),
    category: input.category,
    subject: input.subject,
    description: input.description,
    relatedTrip: input.relatedTrip ? oid(input.relatedTrip) : null,
    relatedRoute: input.relatedRoute ? oid(input.relatedRoute) : null,
    relatedVehicle: input.relatedVehicle ? oid(input.relatedVehicle) : null,
    priority: input.category === "safety" ? "HIGH" : "MEDIUM",
    attachments: (input.attachmentKeys ?? []).map((key) => ({ key, addedAt: new Date() })),
    history: [{ action: "created", by: oid(userId), at: new Date(), note: null, meta: null }],
  });

  await AuditLog.create({
    ...actor(a),
    action: "complaint.create",
    resource: "complaint",
    resourceId: doc._id.toString(),
    meta: { category: input.category },
    severity: "INFO",
  });

  return serialize(doc.toObject());
};

export const listMyComplaints = async (
  userId: string,
  opts: { page: number; limit: number; status?: string }
): Promise<unknown> => {
  const filter: Record<string, unknown> = { complainant: userId };
  if (opts.status) filter.status = opts.status;
  return paginateList(filter, opts);
};

export const listAllComplaints = async (opts: {
  page: number;
  limit: number;
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.category) filter.category = opts.category;
  if (opts.priority) filter.priority = opts.priority;
  if (opts.assignedTo) filter.assignedTo = opts.assignedTo;
  return paginateList(filter, opts);
};

const paginateList = async (
  filter: Record<string, unknown>,
  opts: { page: number; limit: number }
): Promise<unknown> => {
  const total = await Complaint.countDocuments(filter);
  const docs = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .skip((opts.page - 1) * opts.limit)
    .limit(opts.limit)
    .lean();
  return {
    complaints: docs.map(serialize),
    pagination: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
};

export const getComplaint = async (
  id: string,
  requester: { id: string; staff: boolean }
): Promise<unknown> => {
  const doc = await Complaint.findById(id).lean();
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  if (!requester.staff && doc.complainant.toString() !== requester.id)
    throw AppError.forbidden("Not your complaint", "COMPLAINT_FORBIDDEN");
  return serialize(doc);
};

export const getHistory = async (id: string): Promise<unknown> => {
  const doc = await Complaint.findById(id).select("history").lean();
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  return {
    history: (doc.history ?? []).map((h) => ({
      action: h.action,
      by: h.by?.toString() ?? null,
      at: h.at,
      note: h.note ?? null,
      meta: h.meta ?? null,
    })),
  };
};

/* ---------------- staff actions ---------------- */

export const assignComplaint = async (
  id: string,
  assigneeId: string,
  note: string | undefined,
  a?: A
): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  if (doc.status === "CLOSED") throw AppError.conflict("Complaint is closed", "COMPLAINT_CLOSED");

  const assignee = await User.findOne({ _id: assigneeId, isActive: true, deletedAt: null }).lean();
  if (!assignee) throw AppError.notFound("Assignee not found", "ASSIGNEE_NOT_FOUND");

  doc.assignedTo = oid(assigneeId);
  if (doc.status === "OPEN") doc.status = "IN_PROGRESS";
  push(doc, "assigned", a, note, { assigneeId });
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "complaint.assign",
    resource: "complaint",
    resourceId: id,
    meta: { assigneeId },
    severity: "INFO",
  });
  await notify(assigneeId, "COMPLAINT_ASSIGNED", "Complaint assigned to you", doc.subject, id);

  return serialize(doc.toObject());
};

export const updateComplaint = async (
  id: string,
  input: { priority?: IComplaint["priority"]; status?: ComplaintStatus; note?: string },
  a?: A
): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");

  if (input.status) assertTransition(doc.status, input.status);
  if (input.priority && input.priority !== doc.priority) {
    push(doc, "priority_changed", a, input.note, { from: doc.priority, to: input.priority });
    doc.priority = input.priority;
  }
  if (input.status && input.status !== doc.status) {
    push(doc, `status_${input.status.toLowerCase()}`, a, input.note);
    doc.status = input.status;
  } else if (input.note) {
    push(doc, "note", a, input.note);
  }
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "complaint.update",
    resource: "complaint",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });
  return serialize(doc.toObject());
};

export const escalateComplaint = async (
  id: string,
  input: { assigneeId?: string; reason: string },
  a?: A
): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  if (doc.status === "CLOSED") throw AppError.conflict("Complaint is closed", "COMPLAINT_CLOSED");

  const previousAssignee = doc.assignedTo?.toString() ?? null;
  let newAssignee = input.assigneeId ?? null;

  if (!newAssignee) {
    // Auto-route to an operations manager not already assigned.
    const mgr = await User.findOne({
      role: { $in: ["TRANSPORT_MANAGER", "ADMIN", "SUPER_ADMIN"] },
      isActive: true,
      deletedAt: null,
      _id: { $ne: doc.assignedTo ?? undefined },
    })
      .sort({ createdAt: 1 })
      .lean();
    newAssignee = mgr?._id?.toString() ?? null;
  }

  doc.escalationLevel += 1;
  doc.status = "ESCALATED";
  if (doc.priority !== "URGENT") {
    doc.priority = doc.priority === "HIGH" ? "URGENT" : "HIGH";
  }
  if (newAssignee) doc.assignedTo = oid(newAssignee);
  push(doc, "escalated", a, input.reason, {
    level: doc.escalationLevel,
    from: previousAssignee,
    to: newAssignee,
  });
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "complaint.escalate",
    resource: "complaint",
    resourceId: id,
    meta: { level: doc.escalationLevel, from: previousAssignee, to: newAssignee, reason: input.reason },
    severity: "WARN",
  });
  if (newAssignee) await notify(newAssignee, "COMPLAINT_ESCALATED", "Complaint escalated to you", doc.subject, id);

  return serialize(doc.toObject());
};

export const resolveComplaint = async (id: string, note: string, a?: A): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  assertTransition(doc.status, "RESOLVED");

  doc.status = "RESOLVED";
  doc.resolution = { note, resolvedBy: a?.id ? oid(a.id) : null, resolvedAt: new Date() };
  push(doc, "resolved", a, note);
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "complaint.resolve",
    resource: "complaint",
    resourceId: id,
    severity: "INFO",
  });
  await notify(
    doc.complainant.toString(),
    "COMPLAINT_RESOLVED",
    "Your complaint has been resolved",
    doc.subject,
    id
  );
  return serialize(doc.toObject());
};

export const closeComplaint = async (id: string, note: string | undefined, a?: A): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  assertTransition(doc.status, "CLOSED");

  doc.status = "CLOSED";
  push(doc, "closed", a, note);
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "complaint.close",
    resource: "complaint",
    resourceId: id,
    severity: "INFO",
  });
  return serialize(doc.toObject());
};

export const addAttachment = async (
  id: string,
  userId: string,
  staff: boolean,
  key: string,
  a?: A
): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  if (!staff && doc.complainant.toString() !== userId)
    throw AppError.forbidden("Not your complaint", "COMPLAINT_FORBIDDEN");
  if (doc.status === "CLOSED") throw AppError.conflict("Complaint is closed", "COMPLAINT_CLOSED");

  doc.attachments.push({ key, addedAt: new Date() });
  push(doc, "attachment_added", a, null, { key });
  await doc.save();
  return serialize(doc.toObject());
};

export const submitFeedback = async (
  id: string,
  userId: string,
  input: { rating: number; comment?: string }
): Promise<unknown> => {
  const doc = await Complaint.findById(id);
  if (!doc) throw AppError.notFound("Complaint not found", "COMPLAINT_NOT_FOUND");
  if (doc.complainant.toString() !== userId)
    throw AppError.forbidden("Not your complaint", "COMPLAINT_FORBIDDEN");
  if (!["RESOLVED", "CLOSED"].includes(doc.status))
    throw AppError.conflict("Feedback can only be left on a resolved or closed complaint", "COMPLAINT_NOT_RESOLVED");

  doc.feedback = { rating: input.rating, comment: input.comment ?? null, submittedAt: new Date() };
  push(doc, "feedback", { id: userId }, input.comment ?? null, { rating: input.rating });
  await doc.save();
  return serialize(doc.toObject());
};

/* ---------------- helpers ---------------- */

const notify = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  complaintId: string
): Promise<void> => {
  try {
    await dispatchNotification({
      userId,
      type,
      title,
      body,
      channels: ["inApp"],
      data: { complaintId },
    });
  } catch (err) {
    logger.warn(`complaint notify failed: ${(err as Error).message}`);
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serialize = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  complainant: d.complainant?.toString?.() ?? d.complainant,
  category: d.category,
  subject: d.subject,
  description: d.description,
  relatedTrip: d.relatedTrip?.toString?.() ?? null,
  relatedRoute: d.relatedRoute?.toString?.() ?? null,
  relatedVehicle: d.relatedVehicle?.toString?.() ?? null,
  status: d.status,
  priority: d.priority,
  assignedTo: d.assignedTo?.toString?.() ?? null,
  escalationLevel: d.escalationLevel ?? 0,
  attachments: (d.attachments ?? []).map((x: { key: string; addedAt: Date }) => ({ key: x.key, addedAt: x.addedAt })),
  resolution: d.resolution
    ? {
        note: d.resolution.note,
        resolvedBy: d.resolution.resolvedBy?.toString?.() ?? null,
        resolvedAt: d.resolution.resolvedAt,
      }
    : null,
  feedback: d.feedback
    ? { rating: d.feedback.rating, comment: d.feedback.comment ?? null, submittedAt: d.feedback.submittedAt }
    : null,
  historyCount: (d.history ?? []).length,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
