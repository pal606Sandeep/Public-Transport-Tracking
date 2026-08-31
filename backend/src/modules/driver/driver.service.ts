import { Types } from "mongoose";
import { Driver, IDriver } from "./driver.model.js";
import { User } from "../user/user.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

export type DriverInput = {
  user: string;
  name: string;
  phone?: string | null;
  employeeId: string;
  licenseNumber: string;
  licenseType?: string | null;
  licenseExpiry?: Date | null;
  joiningDate?: Date | null;
  status?: IDriver["status"];
  shift?: Partial<IDriver["shift"]>;
  assigned?: Partial<IDriver["assigned"]>;
};

export type DriverUpdate = Partial<Omit<DriverInput, "user">>;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

export const listDrivers = async (input: {
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
    filter.$or = [{ name: q }, { employeeId: q }, { licenseNumber: q }];
  }

  const total = await Driver.countDocuments(filter);
  const docs = await Driver.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    drivers: docs.map(serializeDriver),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getDriverById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Driver.findOne(filter).populate("user", "name email role").lean();
  if (!doc) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");
  return serializeDriver(doc);
};

export const getDriverByUser = async (userId: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { user: userId };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Driver.findOne(filter).lean();
  if (!doc) throw AppError.notFound("Driver profile not found", "DRIVER_NOT_FOUND");
  return serializeDriver(doc);
};

export const createDriver = async (input: DriverInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const userExists = await User.findById(input.user);
  if (!userExists) throw AppError.notFound("User not found", "USER_NOT_FOUND");

  const exists = await Driver.findOne({ $or: [{ user: input.user }, { employeeId: input.employeeId }] });
  if (exists) throw AppError.conflict("Driver already exists for this user or employeeId", "DRIVER_EXISTS");

  const doc = await Driver.create({
    user: input.user,
    name: input.name,
    phone: input.phone ?? null,
    employeeId: input.employeeId,
    licenseNumber: input.licenseNumber,
    licenseType: input.licenseType ?? null,
    licenseExpiry: input.licenseExpiry ?? null,
    joiningDate: input.joiningDate ?? new Date(),
    status: input.status ?? "ACTIVE",
    shift: input.shift ?? { type: "MORNING" },
    assigned: input.assigned ?? { vehicleId: null, routeId: null, scheduleId: null },
  });

  await AuditLog.create({
    ...actor(a),
    action: "driver.create",
    resource: "driver",
    resourceId: doc._id.toString(),
    meta: { employeeId: doc.employeeId, user: doc.user.toString() },
    severity: "WARN",
  });

  return serializeDriver(doc.toObject());
};

export const updateDriver = async (
  id: string,
  input: DriverUpdate,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Driver.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");

  if (input.employeeId && input.employeeId !== doc.employeeId) {
    const clash = await Driver.findOne({ employeeId: input.employeeId });
    if (clash) throw AppError.conflict("employeeId already in use", "EMPLOYEE_ID_IN_USE");
    doc.employeeId = input.employeeId;
  }
  if (input.name !== undefined) doc.name = input.name;
  if (input.phone !== undefined) doc.phone = input.phone;
  if (input.licenseNumber !== undefined) doc.licenseNumber = input.licenseNumber;
  if (input.licenseType !== undefined) doc.licenseType = input.licenseType;
  if (input.licenseExpiry !== undefined) doc.licenseExpiry = input.licenseExpiry;
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
    action: "driver.update",
    resource: "driver",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeDriver(doc.toObject());
};

export const assignDriver = async (
  id: string,
  input: { vehicleId?: string | null; routeId?: string | null; scheduleId?: string | null },
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Driver.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");

  doc.assigned = {
    vehicleId: input.vehicleId ? new Types.ObjectId(input.vehicleId) : null,
    routeId: input.routeId ? new Types.ObjectId(input.routeId) : null,
    scheduleId: input.scheduleId ? new Types.ObjectId(input.scheduleId) : null,
  };
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "driver.assign",
    resource: "driver",
    resourceId: id,
    meta: { vehicleId: doc.assigned.vehicleId?.toString(), routeId: doc.assigned.routeId?.toString() },
    severity: "WARN",
  });

  return serializeDriver(doc.toObject());
};

export const setDriverStatus = async (id: string, status: IDriver["status"]): Promise<unknown> => {
  const doc = await Driver.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");
  doc.status = status;
  await doc.save();
  return { ok: true };
};

export const recordAttendance = async (
  id: string,
  input: { date: Date; checkIn?: Date | null; checkOut?: Date | null }
): Promise<unknown> => {
  const doc = await Driver.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");

  const day = (input.date instanceof Date ? input.date : new Date(input.date)).setHours(0, 0, 0, 0);
  const existing = doc.attendance.find((a) => a.date.setHours(0, 0, 0, 0) === day);
  if (existing) {
    if (input.checkIn) existing.checkIn = input.checkIn;
    if (input.checkOut) existing.checkOut = input.checkOut;
  } else {
    doc.attendance.push({ date: new Date(day), checkIn: input.checkIn ?? null, checkOut: input.checkOut ?? null });
  }
  await doc.save();
  return serializeDriver(doc.toObject());
};

export const removeDriver = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Driver.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "driver.delete",
    resource: "driver",
    resourceId: id,
    severity: "WARN",
  });
};

/* ---------- /me/performance (P2-21/P2-13 metrics stubbed) ---------- */

export const getPerformanceByUser = async (userId: string): Promise<unknown> => {
  const doc = await Driver.findOne({ user: userId, deletedAt: null }).lean();
  if (!doc) throw AppError.notFound("Driver profile not found", "DRIVER_NOT_FOUND");
  return buildPerformance(doc);
};

export const getPerformanceByDriverId = async (driverId: string): Promise<unknown> => {
  const doc = await Driver.findOne({ _id: driverId, deletedAt: null }).lean();
  if (!doc) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");
  return buildPerformance(doc);
};

const daysUntil = (d: Date | string): number => {
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const buildPerformance = (d: {
  _id: unknown;
  user: unknown;
  name: unknown;
  employeeId: unknown;
  status: unknown;
  licenseExpiry?: unknown;
  complaintsCount?: unknown;
}): unknown => ({
  driverId: d._id?.toString?.() ?? d._id,
  user: d.user?.toString?.() ?? d.user,
  name: d.name,
  employeeId: d.employeeId,
  status: d.status,
  licenseExpiry: d.licenseExpiry ?? null,
  licenseExpiryDays: d.licenseExpiry ? daysUntil(d.licenseExpiry as Date | string) : null,
  complaintsCount: d.complaintsCount ?? 0,
  metrics: {
    note: "Pending P2-21 (trip statistics) + P2-13 (delay detection) events.",
    onTimePct: null,
    tripsCompleted: null,
    delays: null,
  },
});

/* --------------------------- serializers --------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeDriver = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  user: d.user?.toString?.() ?? d.user,
  name: d.name,
  phone: d.phone ?? null,
  employeeId: d.employeeId,
  licenseNumber: d.licenseNumber,
  licenseType: d.licenseType ?? null,
  licenseExpiry: d.licenseExpiry ?? null,
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
  complaintsCount: d.complaintsCount ?? 0,
  performance: d.performance ?? null,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { IDriver };
