import mongoose, { Types } from "mongoose";
import { Trip, ITrip } from "./trip.model.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { Driver } from "../driver/driver.model.js";
import { Conductor } from "../conductor/conductor.model.js";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { tripStatsQueue } from "../tracking/queues/tracking.queues.js";
import { setDriverOnBreak, setDriverOnTrip } from "../tracking/geo/driver-status.service.js";
import { updateVehicleStatus } from "../tracking/tracking.service.js";
import { detectCurrentStop } from "../tracking/geo/current-stop.service.js";
import { SystemSetting } from "../../models/systemSetting.model.js";

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

    // Contract checkpoint: trip PAUSED -> real-time status ON_BREAK (not
    // OFFLINE — offline-detection.service.ts already exempts PAUSED trips
    // from the offline sweep); resuming to ACTIVE flips it back to ON_TRIP.
    const driverId = out.driver as string | null;
    const vehicleId = out.vehicle as string | null;
    if (driverId && vehicleId) {
      if (target === "PAUSED") {
        await setDriverOnBreak(driverId, vehicleId, id).catch(() => undefined);
        await updateVehicleStatus(vehicleId, "ON_BREAK", { tripId: id, driverId }).catch(() => undefined);
      } else if (target === "ACTIVE") {
        await setDriverOnTrip(driverId, vehicleId, id, out.route as string).catch(() => undefined);
        await updateVehicleStatus(vehicleId, "ON_TRIP", { tripId: id, driverId }).catch(() => undefined);
      }
    }

    // P2-21 — trip end (including admin force-end via transition) hands off
    // statistics computation to the tracking engine; it responds with
    // TRIP_STATS_READY on the event bus once done. Trip service does not
    // compute stats itself.
    if (target === "COMPLETED") {
      await tripStatsQueue.add("compute-stats", { tripId: id }).catch((err: Error) => {
        AuditLog.create({
          action: "trip.stats_enqueue_failed",
          resource: "trip",
          resourceId: id,
          meta: { error: err.message },
          severity: "WARN",
        }).catch(() => undefined);
      });
    }

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

// P1-28 — active-trip recovery + pause/resume/end

export const getActiveTripForUser = async (userId: string): Promise<unknown> => {
  const driver = await Driver.findOne({ user: userId, deletedAt: null }).lean();
  const conductor = await Conductor.findOne({ user: userId, deletedAt: null }).lean();

  const driverId = driver?._id ?? null;
  const conductorId = conductor?._id ?? null;

  const match: Record<string, unknown> = {
    status: { $in: ["ACTIVE", "PAUSED"] as const },
  };

  if (driverId && conductorId) {
    match.$or = [{ driver: driverId }, { conductor: conductorId }];
  } else if (driverId) {
    match.driver = driverId;
  } else if (conductorId) {
    match.conductor = conductorId;
  } else {
    return null;
  }

  const trip = await Trip.findOne(match)
    .populate("route", "routeNumber name geometry orderedStops")
    .populate("vehicle", "registrationNumber")
    .populate("currentStop", "name code")
    .lean();

  if (!trip) return null;

  return await serializeActiveTrip(
    trip,
    driverId ? driverId.toString() : null,
    conductorId ? conductorId.toString() : null
  );
};

const serializeActiveTrip = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  callerDriverId: string | null,
  callerConductorId: string | null
): Promise<Record<string, unknown>> => {
  const route = t.route as Record<string, unknown> | null;
  const orderedStops = (route?.orderedStops as Array<{ stopId: string | Types.ObjectId; sequence: number; scheduledOffsetMinutes: number }> | undefined) ?? [];

  const stopIds = orderedStops.map((s) => (typeof s.stopId === "string" ? s.stopId : s.stopId.toString()));

  const stops = stopIds.length
    ? (await Stop.find({ _id: { $in: stopIds } }, "name code location").lean()) as unknown as Array<Record<string, unknown>>
    : [];

  const stopMap = new Map(stops.map((s) => [String(s._id), s]));

  const enrichedStops = orderedStops
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => {
      const sid = typeof s.stopId === "string" ? s.stopId : s.stopId.toString();
      const raw = stopMap.get(sid);
      return {
        stopId: sid,
        sequence: s.sequence,
        scheduledOffsetMinutes: s.scheduledOffsetMinutes,
        name: raw?.name ?? null,
        code: raw?.code ?? null,
        location: raw?.location ?? null,
      };
    });

  return {
    _id: t._id?.toString?.(),
    status: t.status,
    route: route
      ? {
          _id: route._id?.toString?.(),
          routeNumber: route.routeNumber,
          name: route.name,
          geometry: route.geometry ?? null,
          orderedStops: enrichedStops,
        }
      : null,
    vehicle: t.vehicle?._id?.toString?.() ?? t.vehicle ?? null,
    driver: t.driver?.toString?.() ?? t.driver ?? null,
    conductor: t.conductor?.toString?.() ?? t.conductor ?? null,
    startedAt: t.startTime ?? null,
    currentStop: t.currentStop
      ? {
          _id: t.currentStop._id?.toString?.(),
          name: t.currentStop.name,
          code: t.currentStop.code,
        }
      : null,
    lastKnownPosition: t.lastKnownPosition ?? null,
    checklist: t.checklist ?? null,
  };
};

export const getTripResumeState = async (tripId: string): Promise<unknown> => {
  const trip = await Trip.findById(tripId)
    .populate("route", "routeNumber name geometry orderedStops")
    .populate("currentStop", "name code")
    .lean();
  if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");

  const callerDriverId = typeof trip.driver === "string" ? trip.driver : trip.driver?.toString?.() ?? null;
  const callerConductorId = typeof trip.conductor === "string" ? trip.conductor : trip.conductor?.toString?.() ?? null;

  return await serializeActiveTrip(trip, callerDriverId, callerConductorId);
};

export const pauseTrip = async (id: string, a?: A): Promise<unknown> => {
  return transitionTrip(id, "PAUSED", undefined, a);
};

export const resumeTrip = async (id: string, a?: A): Promise<unknown> => {
  return transitionTrip(id, "ACTIVE", undefined, a);
};

export const endTrip = async (id: string, a?: A): Promise<unknown> => {
  const session = await mongoose.startSession();
  try {
    let out!: Record<string, unknown>;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(id).session(session);
      if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
      if (!["ACTIVE", "PAUSED"].includes(trip.status))
        throw AppError.conflict(`Cannot end a trip in status ${trip.status}`, "INVALID_TRIP_STATUS");

      trip.status = "COMPLETED";
      trip.endTime = new Date();
      await trip.save({ session });

      if (trip.vehicle) {
        await Vehicle.updateOne({ _id: trip.vehicle }, { $set: { status: "ACTIVE" } }).session(session);
      }
      out = serializeTrip(trip.toObject());
    });

    await AuditLog.create({
      ...actor(a),
      action: "trip.end",
      resource: "trip",
      resourceId: id,
      severity: "WARN",
    });

    await tripStatsQueue.add("compute-stats", { tripId: id }).catch((err: Error) => {
      AuditLog.create({
        action: "trip.stats_enqueue_failed",
        resource: "trip",
        resourceId: id,
        meta: { error: err.message },
        severity: "WARN",
      }).catch(() => undefined);
    });

    return out;
  } finally {
    await session.endSession();
  }
};

// P1-29 — start + force-end + pre-trip checklist

export const startTrip = async (tripId: string, a?: A): Promise<unknown> => {
  const session = await mongoose.startSession();
  try {
    let out!: Record<string, unknown>;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(tripId).session(session);
      if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
      if (!["SCHEDULED", "ASSIGNED"].includes(trip.status))
        throw AppError.conflict(`Cannot start a trip in status ${trip.status}`, "INVALID_TRIP_STATUS");
      if (!trip.driver || !trip.vehicle)
        throw AppError.conflict("Trip must have a driver and vehicle assigned before it can start", "TRIP_NOT_ASSIGNED");
      if (await checkChecklistBlocksStart(tripId))
        throw AppError.conflict("Pre-trip checklist has failed items; cannot start trip", "CHECKLIST_BLOCKED");

      trip.status = "ACTIVE";
      trip.startTime = new Date();
      await trip.save({ session });
      out = serializeTrip(trip.toObject());
    });

    await AuditLog.create({
      ...actor(a),
      action: "trip.start",
      resource: "trip",
      resourceId: tripId,
      severity: "WARN",
    });

    const tripOut = await Trip.findById(tripId).lean();
    const driverId = tripOut?.driver ? tripOut.driver.toString() : null;
    const vehicleId = tripOut?.vehicle ? tripOut.vehicle.toString() : null;
    const routeId = tripOut?.route ? tripOut.route.toString() : "";
    if (driverId && vehicleId) {
      await setDriverOnTrip(driverId, vehicleId, tripId, routeId).catch(() => undefined);
      await updateVehicleStatus(vehicleId, "ON_TRIP", { tripId, driverId }).catch(() => undefined);
    }

    return out;
  } finally {
    await session.endSession();
  }
};

export const forceEndTrip = async (id: string, a?: A): Promise<unknown> => {
  const session = await mongoose.startSession();
  try {
    let out!: Record<string, unknown>;
    await session.withTransaction(async () => {
      const trip = await Trip.findById(id).session(session);
      if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");

      trip.status = "COMPLETED";
      trip.endTime = new Date();
      await trip.save({ session });

      if (trip.vehicle) {
        await Vehicle.updateOne({ _id: trip.vehicle }, { $set: { status: "ACTIVE" } }).session(session);
      }
      out = serializeTrip(trip.toObject());
    });

    await AuditLog.create({
      ...actor(a),
      action: "trip.force_end",
      resource: "trip",
      resourceId: id,
      severity: "WARN",
    });

    await tripStatsQueue.add("compute-stats", { tripId: id }).catch((err: Error) => {
      AuditLog.create({
        action: "trip.stats_enqueue_failed",
        resource: "trip",
        resourceId: id,
        meta: { error: err.message },
        severity: "WARN",
      }).catch(() => undefined);
    });

    return out;
  } finally {
    await session.endSession();
  }
};

export const submitChecklist = async (tripId: string, checklist: Record<string, unknown>, a?: A): Promise<unknown> => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");

  const allowedItems = ["fuel", "tyres", "brakes", "lights", "documentsValid", "cleanliness"];
  const clean: Record<string, unknown> = {};
  for (const key of allowedItems) {
    if (key in checklist) {
      clean[key] = checklist[key];
    }
  }

  trip.checklist = {
    ...(trip.checklist as Record<string, unknown> | null),
    ...clean,
    submittedAt: new Date(),
    submittedBy: a?.id ?? null,
  };
  await trip.save();

  await AuditLog.create({
    ...actor(a),
    action: "trip.checklist",
    resource: "trip",
    resourceId: tripId,
    meta: { checklist: clean },
    severity: "INFO",
  });

  return { _id: trip._id.toString(), checklist: trip.checklist };
};

export const getChecklistBlockFlag = async (): Promise<boolean> => {
  const doc = await SystemSetting.findOne({ key: "checklistBlocksTripStart" }).lean();
  const val = doc?.value;
  if (typeof val === "boolean") return val;
  return false;
};

export const checkChecklistBlocksStart = async (tripId: string): Promise<boolean> => {
  const block = await getChecklistBlockFlag();
  if (!block) return false;

  const trip = await Trip.findById(tripId).lean();
  const checklist = (trip?.checklist as Record<string, unknown> | null) ?? null;
  if (!checklist) return true;

  const items = ["fuel", "tyres", "brakes", "lights", "documentsValid", "cleanliness"];
  for (const item of items) {
    if (checklist[item] === false) return true;
  }
  return false;
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
  passengerSummary: t.passengerSummary ?? null,
  reconciliation: t.reconciliation ?? null,
});
