import { Types } from "mongoose";
import { Schedule, ISchedule } from "./schedule.model.js";
import { Trip } from "../trip/trip.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

export type ScheduleInput = {
  name: string;
  code?: string | null;
  route: string;
  vehicle?: string | null;
  driver?: string | null;
  conductor?: string | null;
  frequencyType?: ISchedule["frequencyType"];
  daysOfWeek?: number[];
  departureTimes: string[];
  durationMin?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
};

export type ScheduleUpdate = Partial<Omit<ScheduleInput, "route">>;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

const oid = (v?: string | null): Types.ObjectId | null => (v ? new Types.ObjectId(v) : null);

export const listSchedules = async (input: {
  page: number;
  limit: number;
  search?: string;
  route?: string;
  isActive?: string;
  includeDeleted?: boolean;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = {};
  if (!input.includeDeleted) filter.deletedAt = null;
  if (input.isActive) filter.isActive = input.isActive === "true";
  if (input.route) filter.route = input.route;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: q }, { code: q }];
  }

  const total = await Schedule.countDocuments(filter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: any[] = await Schedule.find(filter)
    .populate("route", "routeNumber name")
    .populate("vehicle", "registrationNumber")
    .populate("driver", "name employeeId")
    .populate("conductor", "name employeeId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    schedules: docs.map(serializeSchedule),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getScheduleById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = await Schedule.findOne(filter)
    .populate("route", "routeNumber name")
    .populate("vehicle", "registrationNumber")
    .populate("driver", "name employeeId")
    .populate("conductor", "name employeeId")
    .lean();
  if (!doc) throw AppError.notFound("Schedule not found", "SCHEDULE_NOT_FOUND");
  return serializeSchedule(doc);
};

export const createSchedule = async (input: ScheduleInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Schedule.create({
    name: input.name,
    code: input.code ?? null,
    route: new Types.ObjectId(input.route),
    vehicle: oid(input.vehicle),
    driver: oid(input.driver),
    conductor: oid(input.conductor),
    frequencyType: input.frequencyType ?? "DAILY",
    daysOfWeek: input.daysOfWeek ?? [],
    departureTimes: input.departureTimes,
    durationMin: input.durationMin ?? 60,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    isActive: input.isActive ?? true,
  });

  await AuditLog.create({
    ...actor(a),
    action: "schedule.create",
    resource: "schedule",
    resourceId: doc._id.toString(),
    meta: { name: doc.name, route: doc.route.toString() },
    severity: "WARN",
  });

  return serializeSchedule(doc.toObject());
};

export const updateSchedule = async (id: string, input: ScheduleUpdate, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Schedule.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Schedule not found", "SCHEDULE_NOT_FOUND");

  if (input.name !== undefined) doc.name = input.name;
  if (input.code !== undefined) doc.code = input.code;
  if (input.vehicle !== undefined) doc.vehicle = oid(input.vehicle as string);
  if (input.driver !== undefined) doc.driver = oid(input.driver as string);
  if (input.conductor !== undefined) doc.conductor = oid(input.conductor as string);
  if (input.frequencyType !== undefined) doc.frequencyType = input.frequencyType;
  if (input.daysOfWeek !== undefined) doc.daysOfWeek = input.daysOfWeek;
  if (input.departureTimes !== undefined) doc.departureTimes = input.departureTimes;
  if (input.durationMin !== undefined) doc.durationMin = input.durationMin;
  if (input.startDate !== undefined) doc.startDate = input.startDate;
  if (input.endDate !== undefined) doc.endDate = input.endDate;
  if (input.isActive !== undefined) doc.isActive = input.isActive;

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "schedule.update",
    resource: "schedule",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeSchedule(doc.toObject());
};

export const removeSchedule = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Schedule.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Schedule not found", "SCHEDULE_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "schedule.delete",
    resource: "schedule",
    resourceId: id,
    severity: "WARN",
  });
};

const appliesOnDate = (s: ISchedule, date: Date): boolean => {
  const d = new Date(date);
  const dow = d.getUTCDay();
  switch (s.frequencyType) {
    case "DAILY":
      return true;
    case "WEEKLY":
      return (s.daysOfWeek ?? []).includes(dow);
    case "WEEKEND":
      return dow === 0 || dow === 6;
    case "HOLIDAY":
    case "SPECIAL":
      if (s.startDate && s.endDate) return d >= s.startDate && d <= s.endDate;
      return false;
    default:
      return true;
  }
};

export const generateTrips = async (
  id: string,
  input: { from: Date; to: Date },
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Schedule.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Schedule not found", "SCHEDULE_NOT_FOUND");
  if (!doc.isActive) throw AppError.conflict("Schedule is inactive", "SCHEDULE_INACTIVE");
  if (input.from > input.to) throw AppError.badRequest("from must be <= to", "INVALID_DATE_RANGE");

  const created: Record<string, unknown>[] = [];
  const cursor = new Date(input.from);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(input.to);
  last.setUTCHours(23, 59, 59, 999);

  while (cursor <= last) {
    if (appliesOnDate(doc, cursor)) {
      for (const time of doc.departureTimes) {
        const [h, m] = time.split(":").map(Number);
        const scheduledStart = new Date(cursor);
        scheduledStart.setUTCHours(h, m, 0, 0);
        const scheduledEnd = new Date(scheduledStart.getTime() + doc.durationMin * 60000);

        const trip = await Trip.create({
          schedule: doc._id,
          route: doc.route,
          vehicle: doc.vehicle ?? null,
          driver: doc.driver ?? null,
          conductor: doc.conductor ?? null,
          status: "SCHEDULED",
          scheduledStartAt: scheduledStart,
          scheduledEndAt: scheduledEnd,
        });
        created.push(serializeTrip(trip.toObject()));
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  await AuditLog.create({
    ...actor(a),
    action: "schedule.generate",
    resource: "schedule",
    resourceId: id,
    meta: { from: input.from, to: input.to, created: created.length },
    severity: "WARN",
  });

  return { count: created.length, trips: created };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serializeTrip = (t: any): Record<string, unknown> => ({
  _id: t._id?.toString?.() ?? t._id,
  schedule: t.schedule?.toString?.() ?? t.schedule ?? null,
  route: t.route?.toString?.() ?? t.route,
  vehicle: t.vehicle?.toString?.() ?? t.vehicle ?? null,
  driver: t.driver?.toString?.() ?? t.driver ?? null,
  conductor: t.conductor?.toString?.() ?? t.conductor ?? null,
  status: t.status ?? "SCHEDULED",
  scheduledStartAt: t.scheduledStartAt ?? null,
  scheduledEndAt: t.scheduledEndAt ?? null,
  startTime: t.startTime ?? null,
  endTime: t.endTime ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeSchedule = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  code: d.code ?? null,
  route: d.route?._id?.toString?.() ?? d.route?.toString?.() ?? d.route,
  vehicle: d.vehicle?._id?.toString?.() ?? d.vehicle?.toString?.() ?? d.vehicle ?? null,
  driver: d.driver?._id?.toString?.() ?? d.driver?.toString?.() ?? d.driver ?? null,
  conductor: d.conductor?._id?.toString?.() ?? d.conductor?.toString?.() ?? d.conductor ?? null,
  frequencyType: d.frequencyType ?? "DAILY",
  daysOfWeek: d.daysOfWeek ?? [],
  departureTimes: d.departureTimes ?? [],
  durationMin: d.durationMin ?? 60,
  startDate: d.startDate ?? null,
  endDate: d.endDate ?? null,
  isActive: d.isActive ?? true,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { ISchedule };
