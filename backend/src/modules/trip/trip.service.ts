import mongoose, { Types } from "mongoose";
import { Trip, ITrip } from "./trip.model.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { Driver } from "../driver/driver.model.js";
import { Conductor } from "../conductor/conductor.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

const oid = (v?: string | null): Types.ObjectId | null => (v ? new Types.ObjectId(v) : null);

type A = { id?: string; role?: string } | undefined;

// Valid transitions: from status -> allowed next statuses
const TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["ASSIGNED", "ACTIVE", "CANCELLED", "MISSED"],
  ASSIGNED: ["ACTIVE", "CANCELLED", "MISSED"],
  ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["ACTIVE", "COMPLETED", "CANCELLED", "MISSED"],
  COMPLETED: [],
  CANCELLED: [],
  MISSED: [],
};

export const listTrips = async (input: {
  page: number;
  limit: number;
  status?: string;
  route?: string;
  driver?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.route) filter.route = input.route;
  if (input.driver) filter.driver = input.driver;
  if (input.dateFrom || input.dateTo) {
    filter.scheduledStartAt = {
      ...(input.dateFrom ? { $gte: input.dateFrom } : {}),
      ...(input.dateTo ? { $lte: input.dateTo } : {}),
    };
  }

  const total = await Trip.countDocuments(filter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs: any[] = await Trip.find(filter)
    .populate("route", "routeNumber name")
    .populate("vehicle", "registrationNumber")
    .populate("driver", "name employeeId")
    .populate("conductor", "name employeeId")
    .populate("schedule", "name")
    .sort({ scheduledStartAt: 1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();

  return {
    trips: docs.map(serializeTrip),
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
};

export const getTripById = async (id: string): Promise<unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = await Trip.findById(id)
    .populate("route", "routeNumber name")
    .populate("vehicle", "registrationNumber")
    .populate("driver", "name employeeId")
    .populate("conductor", "name employeeId")
    .populate("schedule", "name")
    .lean();
  if (!doc) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
  return serializeTrip(doc);
};

export const createTrip = async (input: {
  schedule?: string | null;
  route: string;
  vehicle?: string | null;
  driver?: string | null;
  conductor?: string | null;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
}, a?: A): Promise<unknown> => {
  const trip = await Trip.create({
    schedule: oid(input.schedule),
    route: new Types.ObjectId(input.route),
    vehicle: oid(input.vehicle),
    driver: oid(input.driver),
    conductor: oid(input.conductor),
    status: "SCHEDULED",
    scheduledStartAt: input.scheduledStartAt ?? null,
    scheduledEndAt: input.scheduledEndAt ?? null,
  });

  await AuditLog.create({
    ...actor(a),
    action: "trip.create",
    resource: "trip",
    resourceId: trip._id.toString(),
    meta: { route: input.route },
    severity: "WARN",
  });

  return serializeTrip(trip.toObject());
};

export const assignTrip = async (
  id: string,
  input: { driverId?: string | null; vehicleId?: string | null; conductorId?: string | null },
  a?: A
): Promise<unknown> => {
  const session = await mongoose.startSession();
  try {
    let out!: Record<string, unknown>;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(id).session(session);
      if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
      if (!["SCHEDULED", "ASSIGNED"].includes(trip.status))
        throw AppError.conflict(`Cannot assign a trip in status ${trip.status}`, "INVALID_TRIP_STATUS");

      const driverId = oid(input.driverId ?? null);
      const vehicleId = oid(input.vehicleId ?? null);
      const conductorId = oid(input.conductorId ?? null);

      if (driverId) {
        const drv = await Driver.findById(driverId).session(session);
        if (!drv || drv.deletedAt) throw AppError.notFound("Driver not found", "DRIVER_NOT_FOUND");
      }
      if (vehicleId) {
        const veh = await Vehicle.findById(vehicleId).session(session);
        if (!veh || veh.deletedAt) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");
      }
      if (conductorId) {
        const con = await Conductor.findById(conductorId).session(session);
        if (!con || con.deletedAt) throw AppError.notFound("Conductor not found", "CONDUCTOR_NOT_FOUND");
      }

      trip.driver = driverId;
      trip.vehicle = vehicleId;
      trip.conductor = conductorId;
      if (trip.status === "SCHEDULED") trip.status = "ASSIGNED";
      await trip.save({ session });

      if (vehicleId && trip.route) {
        await Vehicle.updateOne({ _id: vehicleId }, { $set: { assignedRoute: trip.route, assignedDriver: driverId } }).session(session);
      }
      out = serializeTrip(trip.toObject());
    });
    await AuditLog.create({
      ...actor(a),
      action: "trip.assign",
      resource: "trip",
      resourceId: id,
      meta: input,
      severity: "WARN",
    });
    return out;
  } finally {
    await session.endSession();
  }
};

export const transitionTrip = async (
  id: string,
  target: ITrip["status"],
  extra?: { reason?: string },
  a?: A
): Promise<unknown> => {
  const session = await mongoose.startSession();
  try {
    let out!: Record<string, unknown>;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(id).session(session);
      if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
      const allowed = TRANSITIONS[trip.status] ?? [];
      if (!allowed.includes(target))
        throw AppError.conflict(`Invalid transition ${trip.status} -> ${target}`, "INVALID_TRANSITION");

      // cross-collection write for terminal/active states
      if (target === "ACTIVE" && trip.vehicle) {
        await Vehicle.updateOne({ _id: trip.vehicle }, { $set: { status: "IN_TRANSIT" } }).session(session);
      }
      if ((target === "COMPLETED" || target === "CANCELLED" || target === "MISSED") && trip.vehicle) {
        await Vehicle.updateOne({ _id: trip.vehicle }, { $set: { status: "ACTIVE" } }).session(session);
      }

      trip.status = target;
      if (target === "ACTIVE") trip.startTime = new Date();
      if (target === "COMPLETED") trip.endTime = new Date();
      if (target === "CANCELLED") {
        trip.cancelReason = extra?.reason ?? "Trip cancelled";
        trip.cancelledAt = new Date();
      }
      await trip.save({ session });
      out = serializeTrip(trip.toObject());
    });
    await AuditLog.create({
      ...actor(a),
      action: `trip.${target.toLowerCase()}`,
      resource: "trip",
      resourceId: id,
      severity: "WARN",
    });
    return out;
  } finally {
    await session.endSession();
  }
};

export const bulkUpdateStatus = async (
  tripIds: string[],
  target: "CANCELLED" | "MISSED",
  extra?: { reason?: string },
  a?: A
): Promise<unknown> => {
  const out: unknown[] = [];
  for (const id of tripIds) {
    out.push(await transitionTrip(id, target, extra, a));
  }
  return { updated: out.length, trips: out };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serializeTrip = (t: any): Record<string, unknown> => ({
  _id: t._id?.toString?.() ?? t._id,
  schedule: t.schedule?._id?.toString?.() ?? t.schedule?.toString?.() ?? t.schedule ?? null,
  route: t.route?._id?.toString?.() ?? t.route?.toString?.() ?? t.route,
  vehicle: t.vehicle?._id?.toString?.() ?? t.vehicle?.toString?.() ?? t.vehicle ?? null,
  driver: t.driver?._id?.toString?.() ?? t.driver?.toString?.() ?? t.driver ?? null,
  conductor: t.conductor?._id?.toString?.() ?? t.conductor?.toString?.() ?? t.conductor ?? null,
  status: t.status ?? "SCHEDULED",
  scheduledStartAt: t.scheduledStartAt ?? null,
  scheduledEndAt: t.scheduledEndAt ?? null,
  startTime: t.startTime ?? null,
  endTime: t.endTime ?? null,
  cancelReason: t.cancelReason ?? null,
  cancelledAt: t.cancelledAt ?? null,
});
