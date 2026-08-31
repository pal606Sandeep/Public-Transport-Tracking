import { Types } from "mongoose";
import { Conductor, IConductor } from "./conductor.model.js";
import { User } from "../user/user.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

export type ConductorInput = {
  user: string;
  name: string;
  phone?: string | null;
  employeeId: string;
  joiningDate?: Date | null;
  status?: IConductor["status"];
  shift?: Partial<IConductor["shift"]>;
  assigned?: Partial<IConductor["assigned"]>;
};

export type ConductorUpdate = Partial<Omit<ConductorInput, "user">>;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

export const listConductors = async (input: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: q }, { employeeId: q }];
  }

  const total = await Conductor.countDocuments(filter);
  const docs = await Conductor.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    conductors: docs.map(serializeConductor),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getConductorById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Conductor.findOne(filter).populate("user", "name email role").lean();
  if (!doc) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");
  return serializeConductor(doc);
};

export const getConductorByUser = async (userId: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { user: userId };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Conductor.findOne(filter).lean();
  if (!doc) throw AppError.notFound("Conductor profile not found", "CONDUCTOR_NOT_FOUND");
  return serializeConductor(doc);
};

export const createConductor = async (
  input: ConductorInput,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const userExists = await User.findById(input.user);
  if (!userExists) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  const exists = await Conductor.findOne({ $or: [{ user: input.user }, { employeeId: input.employeeId }] });
  if (exists) throw AppError.conflict("Conductor already exists for this user or employeeId", "CONDUCTOR_EXISTS");

  const doc = await Conductor.create({
    user: input.user,
    name: input.name,
    phone: input.phone ?? null,
    employeeId: input.employeeId,
    joiningDate: input.joiningDate ?? new Date(),
    status: input.status ?? "ACTIVE",
    shift: input.shift ?? { type: "MORNING" },
    assigned: input.assigned ?? { vehicleId: null, routeId: null, scheduleId: null },
  });

  await AuditLog.create({
    ...actor(a),
    action: "conductor.create",
    resource: "conductor",
    resourceId: doc._id.toString(),
    meta: { employeeId: doc.employeeId, user: doc.user.toString() },
    severity: "WARN",
  });

  return serializeConductor(doc.toObject());
};

export const updateConductor = async (
  id: string,
  input: ConductorUpdate,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Conductor.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");

  if (input.employeeId && input.employeeId !== doc.employeeId) {
    const clash = await Conductor.findOne({ employeeId: input.employeeId });
    if (clash) throw AppError.conflict("employeeId already in use", "EMPLOYEE_ID_IN_USE");
    doc.employeeId = input.employeeId;
  }
  if (input.name !== undefined) doc.name = input.name;
  if (input.phone !== undefined) doc.phone = input.phone;
  if (input.joiningDate !== undefined) doc.joiningDate = input.joiningDate;
  if (input.status !== undefined) doc.status = input.status;
  if (input.shift) {
    doc.shift = {
      type: input.shift.type ?? doc.shift.type,
      start: input.shift.start ?? doc.shift.start,
      end: input.shift.end ?? doc.shift.end,
    };
  }

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "conductor.update",
    resource: "conductor",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeConductor(doc.toObject());
};

export const assignConductor = async (
  id: string,
  input: { vehicleId?: string | null; routeId?: string | null; scheduleId?: string | null },
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Conductor.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");

  doc.assigned = {
    vehicleId: input.vehicleId ? new Types.ObjectId(input.vehicleId) : null,
    routeId: input.routeId ? new Types.ObjectId(input.routeId) : null,
    scheduleId: input.scheduleId ? new Types.ObjectId(input.scheduleId) : null,
  };
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "conductor.assign",
    resource: "conductor",
    resourceId: id,
    meta: { vehicleId: doc.assigned.vehicleId?.toString(), routeId: doc.assigned.routeId?.toString() },
    severity: "WARN",
  });

  return serializeConductor(doc.toObject());
};

export const setConductorStatus = async (id: string, status: IConductor["status"]): Promise<unknown> => {
  const doc = await Conductor.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");
  doc.status = status;
  await doc.save();
  return { ok: true };
};

export const recordAttendance = async (
  id: string,
  input: { date: Date; checkIn?: Date | null; checkOut?: Date | null }
): Promise<unknown> => {
  const doc = await Conductor.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");

  const day = (input.date instanceof Date ? input.date : new Date(input.date)).setHours(0, 0, 0, 0);
  const existing = doc.attendance.find((a) => a.date.setHours(0, 0, 0, 0) === day);
  if (existing) {
    if (input.checkIn) existing.checkIn = input.checkIn;
    if (input.checkOut) existing.checkOut = input.checkOut;
  } else {
    doc.attendance.push({ date: new Date(day), checkIn: input.checkIn ?? null, checkOut: input.checkOut ?? null });
  }
  await doc.save();
  return serializeConductor(doc.toObject());
};

export const removeConductor = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Conductor.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "conductor.delete",
    resource: "conductor",
    resourceId: id,
    severity: "WARN",
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeConductor = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  user: d.user?.toString?.() ?? d.user,
  name: d.name,
  phone: d.phone ?? null,
  employeeId: d.employeeId,
  joiningDate: d.joiningDate ?? null,
  status: d.status ?? "ACTIVE",
  shift: d.shift ?? { type: "MORNING" },
  assigned: {
    vehicleId: d.assigned?.vehicleId?.toString?.() ?? null,
    routeId: d.assigned?.routeId?.toString?.() ?? null,
    scheduleId: d.assigned?.scheduleId?.toString?.() ?? null,
  },
  attendance: (d.attendance ?? []).map((a: { date: Date; checkIn?: Date; checkOut?: Date }) => ({
    date: a.date,
    checkIn: a.checkIn ?? null,
    checkOut: a.checkOut ?? null,
  })),
  ticketSales: d.ticketSales ?? 0,
  revenueCollected: d.revenueCollected ?? 0,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { IConductor };
