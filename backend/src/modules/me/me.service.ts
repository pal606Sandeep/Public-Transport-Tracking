import mongoose, { Types } from "mongoose";
import { Driver } from "../driver/driver.model.js";
import { Conductor } from "../conductor/conductor.model.js";
import { Trip } from "../trip/trip.model.js";
import { Route } from "../route/route.model.js";
import { AssignmentRequest } from "./me.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

const dayRange = (dateStr: string): { start: Date; end: Date } => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

interface StaffRecord {
  kind: "DRIVER" | "CONDUCTOR";
  id: Types.ObjectId;
  name: string;
  shift: { type?: string; start?: string | null; end?: string | null };
  assigned: { vehicleId?: Types.ObjectId | null; routeId?: Types.ObjectId | null; scheduleId?: Types.ObjectId | null };
  attendance: { date: Date; checkIn?: Date | null; checkOut?: Date | null }[];
  setAttendance: (entry: { date: Date; checkIn?: Date | null; checkOut?: Date | null }) => void;
  save: () => Promise<unknown>;
}

const resolveStaff = async (userId: string): Promise<StaffRecord> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driver: any = await Driver.findOne({ user: userId });
  if (driver && !driver.deletedAt) {
    return {
      kind: "DRIVER",
      id: driver._id,
      name: driver.name,
      shift: driver.shift ?? {},
      assigned: driver.assigned ?? {},
      attendance: driver.attendance ?? [],
      setAttendance: (entry) => {
        const idx = (driver.attendance ?? []).findIndex(
          (e: { date: Date }) => e.date && new Date(e.date).getTime() === entry.date.getTime()
        );
        if (idx >= 0) driver.attendance[idx] = entry;
        else driver.attendance.push(entry);
      },
      save: () => driver.save(),
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conductor: any = await Conductor.findOne({ user: userId });
  if (conductor && !conductor.deletedAt) {
    return {
      kind: "CONDUCTOR",
      id: conductor._id,
      name: conductor.name,
      shift: conductor.shift ?? {},
      assigned: conductor.assigned ?? {},
      attendance: conductor.attendance ?? [],
      setAttendance: (entry) => {
        const idx = (conductor.attendance ?? []).findIndex(
          (e: { date: Date }) => e.date && new Date(e.date).getTime() === entry.date.getTime()
        );
        if (idx >= 0) conductor.attendance[idx] = entry;
        else conductor.attendance.push(entry);
      },
      save: () => conductor.save(),
    };
  }
  throw AppError.notFound("No staff profile linked to this account", "NO_STAFF_PROFILE");
};

export const getAssignments = async (user: { id: string; role?: string }, dateStr?: string): Promise<unknown> => {
  const staff = await resolveStaff(user.id);
  const date = dateStr ?? new Date().toISOString().slice(0, 10);
  const { start, end } = dayRange(date);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const route: any = staff.assigned.routeId
    ? await Route.findById(staff.assigned.routeId).populate("stops", "name code latitude longitude").lean()
    : null;

  const tripFilter: Record<string, unknown> = {
    [staff.kind === "DRIVER" ? "driver" : "conductor"]: staff.id,
    scheduledStartAt: { $gte: start, $lt: end },
  };
  const trips = await Trip.find(tripFilter)
    .populate("vehicle", "registrationNumber model")
    .populate("route", "routeNumber name")
    .sort({ scheduledStartAt: 1 })
    .lean();

  return {
    date,
    staffType: staff.kind,
    staffId: staff.id.toString(),
    name: staff.name,
    shift: staff.shift,
    assignedScheduleId: staff.assigned.scheduleId?.toString?.() ?? null,
    route,
    scheduledTrips: trips.map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v: any = t.vehicle;
      return {
        _id: t._id.toString(),
        status: t.status,
        scheduledStartAt: t.scheduledStartAt,
        scheduledEndAt: t.scheduledEndAt,
        vehicle: v?.registrationNumber ?? v ?? null,
      };
    }),
  };
};

export const requestAssignment = async (
  user: { id: string; role?: string },
  input: { date: string; reason?: string }
): Promise<unknown> => {
  const staff = await resolveStaff(user.id);
  const { start } = dayRange(input.date);
  const doc = await AssignmentRequest.create({
    user: user.id,
    staffType: staff.kind,
    staffId: staff.id,
    requestedDate: start,
    reason: input.reason ?? null,
    status: "PENDING",
  });
  await AuditLog.create({
    ...actor(user),
    action: "assignment.request",
    resource: "assignment",
    resourceId: doc._id.toString(),
    severity: "INFO",
  });
  return {
    _id: doc._id.toString(),
    status: doc.status,
    requestedDate: doc.requestedDate,
    reason: doc.reason,
  };
};

export const listRequests = async (input: { page: number; limit: number; status?: string }): Promise<unknown> => {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  const total = await AssignmentRequest.countDocuments(filter);
  const docs = await AssignmentRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();
  return {
    requests: docs.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyD: any = d;
      return {
        _id: d._id.toString(),
        staffType: d.staffType,
        requestedDate: d.requestedDate,
        status: d.status,
        reason: d.reason,
        note: d.note,
        createdAt: anyD.createdAt,
      };
    }),
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
};

export const decideRequest = async (
  id: string,
  decision: "APPROVE" | "REJECT",
  note: string | undefined,
  user: { id: string; role?: string }
): Promise<unknown> => {
  const doc = await AssignmentRequest.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Assignment request not found", "REQUEST_NOT_FOUND");
  if (doc.status !== "PENDING") throw AppError.conflict("Request already decided", "REQUEST_ALREADY_DECIDED");
  const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
  doc.status = status;
  doc.resolvedBy = new Types.ObjectId(user.id);
  doc.resolvedAt = new Date();
  doc.note = note ?? null;
  await doc.save();
  await AuditLog.create({
    ...actor(user),
    action: status === "APPROVED" ? "assignment.approve" : "assignment.reject",
    resource: "assignment",
    resourceId: id,
    severity: "WARN",
  });
  return { _id: doc._id.toString(), status: doc.status, note: doc.note };
};

export const checkIn = async (user: { id: string; role?: string }, at?: Date): Promise<unknown> => {
  const staff = await resolveStaff(user.id);
  const now = at ?? new Date();
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  staff.setAttendance({ date: day, checkIn: now, checkOut: null });
  await staff.save();
  await AuditLog.create({ ...actor(user), action: "attendance.checkin", resource: "attendance", severity: "INFO" });
  return { staffType: staff.kind, date: day, checkIn: now };
};

export const checkOut = async (user: { id: string; role?: string }, at?: Date): Promise<unknown> => {
  const staff = await resolveStaff(user.id);
  const now = at ?? new Date();
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  const entry = (staff.attendance ?? []).find((e) => e.date && e.checkIn && new Date(e.date).getTime() === day.getTime());
  if (!entry || !entry.checkIn) throw AppError.conflict("No open check-in for today", "NO_CHECKIN");
  if (entry.checkOut) throw AppError.conflict("Already checked out for today", "ALREADY_CHECKED_OUT");
  const checkInDate = new Date(entry.checkIn);
  const workedMinutes = Math.max(0, Math.round((now.getTime() - checkInDate.getTime()) / 60000));
  staff.setAttendance({ date: day, checkIn: entry.checkIn, checkOut: now });
  await staff.save();
  await AuditLog.create({ ...actor(user), action: "attendance.checkout", resource: "attendance", severity: "INFO" });
  return { staffType: staff.kind, date: day, checkIn: entry.checkIn, checkOut: now, workedMinutes };
};
