import { Types } from "mongoose";
import { LostFoundItem, ILostFoundItem } from "./lostFound.model.js";
import { User } from "../user/user.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

const oid = (v: string): Types.ObjectId => new Types.ObjectId(v);
const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

type A = { id?: string; role?: string } | undefined;

interface CreateInput {
  kind: ILostFoundItem["kind"];
  title: string;
  description: string;
  category?: string | null;
  color?: string | null;
  route?: string | null;
  vehicle?: string | null;
  trip?: string | null;
  occurredAt: Date;
  reporterName?: string | null;
  reporterContact?: string | null;
  attachmentKeys?: string[];
}

export const createItem = async (userId: string | null, input: CreateInput, a?: A): Promise<unknown> => {
  const doc = await LostFoundItem.create({
    kind: input.kind,
    reportedBy: userId ? oid(userId) : null,
    reporterName: input.reporterName ?? null,
    reporterContact: input.reporterContact ?? null,
    title: input.title,
    description: input.description,
    category: input.category ?? null,
    color: input.color ?? null,
    route: input.route ? oid(input.route) : null,
    vehicle: input.vehicle ? oid(input.vehicle) : null,
    trip: input.trip ? oid(input.trip) : null,
    occurredAt: input.occurredAt,
    attachments: (input.attachmentKeys ?? []).map((key) => ({ key, addedAt: new Date() })),
    history: [{ action: "reported", by: userId ? oid(userId) : null, at: new Date(), note: null }],
  });

  await AuditLog.create({
    ...actor(a),
    action: "lostFound.create",
    resource: "lostFound",
    resourceId: doc._id.toString(),
    meta: { kind: input.kind },
    severity: "INFO",
  });
  return serialize(doc.toObject());
};

export const listMine = async (
  userId: string,
  opts: { page: number; limit: number; kind?: string; status?: string }
): Promise<unknown> => {
  const filter: Record<string, unknown> = { reportedBy: userId };
  if (opts.kind) filter.kind = opts.kind;
  if (opts.status) filter.status = opts.status;
  return paginate(filter, opts);
};

export const listAll = async (opts: {
  page: number;
  limit: number;
  kind?: string;
  status?: string;
  route?: string;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = {};
  if (opts.kind) filter.kind = opts.kind;
  if (opts.status) filter.status = opts.status;
  if (opts.route) filter.route = opts.route;
  return paginate(filter, opts);
};

const paginate = async (
  filter: Record<string, unknown>,
  opts: { page: number; limit: number }
): Promise<unknown> => {
  const total = await LostFoundItem.countDocuments(filter);
  const docs = await LostFoundItem.find(filter)
    .sort({ occurredAt: -1 })
    .skip((opts.page - 1) * opts.limit)
    .limit(opts.limit)
    .lean();
  return {
    items: docs.map(serialize),
    pagination: { page: opts.page, limit: opts.limit, total, totalPages: Math.max(1, Math.ceil(total / opts.limit)) },
  };
};

export const getItem = async (id: string, requester: { id: string; staff: boolean }): Promise<unknown> => {
  const doc = await LostFoundItem.findById(id).lean();
  if (!doc) throw AppError.notFound("Lost & found item not found", "LOSTFOUND_NOT_FOUND");
  if (!requester.staff && doc.reportedBy?.toString() !== requester.id)
    throw AppError.forbidden("Not your report", "LOSTFOUND_FORBIDDEN");
  return serialize(doc);
};

/**
 * Suggest counterpart items: opposite kind, still open/matched, on the same
 * route (when the source has one) and within ±windowDays of the source's
 * occurredAt. Ranked by time proximity, with light text-overlap bonus.
 */
export const findMatches = async (id: string, windowDays: number): Promise<unknown> => {
  const src = await LostFoundItem.findById(id).lean();
  if (!src) throw AppError.notFound("Lost & found item not found", "LOSTFOUND_NOT_FOUND");

  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const from = new Date(src.occurredAt.getTime() - windowMs);
  const to = new Date(src.occurredAt.getTime() + windowMs);

  const filter: Record<string, unknown> = {
    _id: { $ne: src._id },
    kind: src.kind === "LOST" ? "FOUND" : "LOST",
    status: { $in: ["OPEN", "MATCHED"] },
    occurredAt: { $gte: from, $lte: to },
  };
  if (src.route) filter.route = src.route;

  const candidates = await LostFoundItem.find(filter).sort({ occurredAt: 1 }).limit(50).lean();

  const srcTerms = tokenize(`${src.title} ${src.description} ${src.category ?? ""} ${src.color ?? ""}`);
  const ranked = candidates
    .map((cand) => {
      const timeDeltaHours = Math.abs(cand.occurredAt.getTime() - src.occurredAt.getTime()) / 3_600_000;
      const candTerms = tokenize(`${cand.title} ${cand.description} ${cand.category ?? ""} ${cand.color ?? ""}`);
      const overlap = [...srcTerms].filter((t) => candTerms.has(t)).length;
      // Lower score = better match.
      const score = timeDeltaHours - overlap * 6 - (src.route && cand.route ? 12 : 0);
      return { item: serialize(cand), timeDeltaHours: Math.round(timeDeltaHours * 10) / 10, termOverlap: overlap, score };
    })
    .sort((a, b) => a.score - b.score);

  return {
    source: serialize(src),
    windowDays,
    matches: ranked.map(({ score, ...rest }) => {
      void score;
      return rest;
    }),
  };
};

export const assignItem = async (id: string, assigneeId: string, note: string | undefined, a?: A): Promise<unknown> => {
  const doc = await LostFoundItem.findById(id);
  if (!doc) throw AppError.notFound("Lost & found item not found", "LOSTFOUND_NOT_FOUND");
  if (["RETURNED", "CLOSED"].includes(doc.status))
    throw AppError.conflict("Item case is already closed", "LOSTFOUND_CLOSED");

  const assignee = await User.findOne({ _id: assigneeId, isActive: true, deletedAt: null }).lean();
  if (!assignee) throw AppError.notFound("Assignee not found", "ASSIGNEE_NOT_FOUND");

  doc.assignedTo = oid(assigneeId);
  doc.history.push({ action: "assigned", by: a?.id ? oid(a.id) : null, at: new Date(), note: note ?? null });
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "lostFound.assign",
    resource: "lostFound",
    resourceId: id,
    meta: { assigneeId },
    severity: "INFO",
  });
  return serialize(doc.toObject());
};

export const updateItem = async (
  id: string,
  input: { status?: ILostFoundItem["status"]; note?: string },
  a?: A
): Promise<unknown> => {
  const doc = await LostFoundItem.findById(id);
  if (!doc) throw AppError.notFound("Lost & found item not found", "LOSTFOUND_NOT_FOUND");
  if (doc.status === "CLOSED") throw AppError.conflict("Item case is closed", "LOSTFOUND_CLOSED");

  if (input.status && input.status !== doc.status) {
    doc.history.push({
      action: `status_${input.status.toLowerCase()}`,
      by: a?.id ? oid(a.id) : null,
      at: new Date(),
      note: input.note ?? null,
    });
    doc.status = input.status;
  } else if (input.note) {
    doc.history.push({ action: "note", by: a?.id ? oid(a.id) : null, at: new Date(), note: input.note });
  }
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "lostFound.update",
    resource: "lostFound",
    resourceId: id,
    severity: "INFO",
  });
  return serialize(doc.toObject());
};

/**
 * Confirm a hand-over: link the two records, mark both RETURNED, and record the
 * resolution on each.
 */
export const confirmReturn = async (
  id: string,
  input: { matchId: string; returnedTo: string; note?: string },
  a?: A
): Promise<unknown> => {
  if (id === input.matchId) throw AppError.badRequest("An item cannot match itself", "SELF_MATCH");

  const [primary, counterpart] = await Promise.all([
    LostFoundItem.findById(id),
    LostFoundItem.findById(input.matchId),
  ]);
  if (!primary) throw AppError.notFound("Lost & found item not found", "LOSTFOUND_NOT_FOUND");
  if (!counterpart) throw AppError.notFound("Matched item not found", "MATCH_NOT_FOUND");
  if (primary.kind === counterpart.kind)
    throw AppError.badRequest("A LOST item must be matched with a FOUND item", "KIND_MISMATCH");
  for (const d of [primary, counterpart]) {
    if (["RETURNED", "CLOSED"].includes(d.status))
      throw AppError.conflict("One of the items is already resolved", "LOSTFOUND_RESOLVED");
  }

  const now = new Date();
  const resolution = {
    returnedTo: input.returnedTo,
    confirmedBy: a?.id ? oid(a.id) : null,
    confirmedAt: now,
    note: input.note ?? null,
  };

  for (const [d, other] of [
    [primary, counterpart],
    [counterpart, primary],
  ] as const) {
    d.matchedWith = other._id as Types.ObjectId;
    d.status = "RETURNED";
    d.resolution = resolution;
    d.history.push({ action: "return_confirmed", by: a?.id ? oid(a.id) : null, at: now, note: input.note ?? null });
    await d.save();
  }

  await AuditLog.create({
    ...actor(a),
    action: "lostFound.confirmReturn",
    resource: "lostFound",
    resourceId: id,
    meta: { matchId: input.matchId, returnedTo: input.returnedTo },
    severity: "WARN",
  });

  return { item: serialize(primary.toObject()), match: serialize(counterpart.toObject()) };
};

export const closeItem = async (id: string, note: string | undefined, a?: A): Promise<unknown> => {
  const doc = await LostFoundItem.findById(id);
  if (!doc) throw AppError.notFound("Lost & found item not found", "LOSTFOUND_NOT_FOUND");
  if (doc.status === "CLOSED") return serialize(doc.toObject());
  doc.status = "CLOSED";
  doc.history.push({ action: "closed", by: a?.id ? oid(a.id) : null, at: new Date(), note: note ?? null });
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "lostFound.close",
    resource: "lostFound",
    resourceId: id,
    severity: "INFO",
  });
  return serialize(doc.toObject());
};

/* ---------------- helpers ---------------- */

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "on", "in", "my", "with", "at", "is", "was", "for"]);
const tokenize = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serialize = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  kind: d.kind,
  reportedBy: d.reportedBy?.toString?.() ?? null,
  reporterName: d.reporterName ?? null,
  reporterContact: d.reporterContact ?? null,
  title: d.title,
  description: d.description,
  category: d.category ?? null,
  color: d.color ?? null,
  route: d.route?.toString?.() ?? null,
  vehicle: d.vehicle?.toString?.() ?? null,
  trip: d.trip?.toString?.() ?? null,
  occurredAt: d.occurredAt,
  attachments: (d.attachments ?? []).map((x: { key: string; addedAt: Date }) => ({ key: x.key, addedAt: x.addedAt })),
  status: d.status,
  assignedTo: d.assignedTo?.toString?.() ?? null,
  matchedWith: d.matchedWith?.toString?.() ?? null,
  resolution: d.resolution
    ? {
        returnedTo: d.resolution.returnedTo ?? null,
        confirmedBy: d.resolution.confirmedBy?.toString?.() ?? null,
        confirmedAt: d.resolution.confirmedAt,
        note: d.resolution.note ?? null,
      }
    : null,
  history: (d.history ?? []).map((h: { action: string; by?: Types.ObjectId | null; at: Date; note?: string | null }) => ({
    action: h.action,
    by: h.by?.toString?.() ?? null,
    at: h.at,
    note: h.note ?? null,
  })),
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
