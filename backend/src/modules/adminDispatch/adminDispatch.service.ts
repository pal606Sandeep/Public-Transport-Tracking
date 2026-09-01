import { DispatchMessage } from "./adminDispatch.model.js";
import { AppError } from "../../utils/AppError.js";
import {
  broadcastDispatchMessage,
  broadcastTripForceEnd as broadcastTripForceEndEvent,
} from "../tracking/geo/broadcast.service.js";
import { Trip } from "../trip/trip.model.js";

const actor = (a: { id?: string; role?: string }) => ({ actorId: a.id, actorRole: a.role });

export const sendMessage = async (
  input: { message: string; priority?: "NORMAL" | "URGENT"; targetVehicleId?: string },
  a: { id?: string; role?: string }
) => {
  const doc = await DispatchMessage.create({
    message: input.message,
    priority: input.priority ?? "NORMAL",
    targetVehicleId: input.targetVehicleId,
    fromUserId: a.id,
  });
  broadcastDispatchMessage(input.message, {
    fromUserId: a.id,
    targetVehicleId: input.targetVehicleId,
    priority: input.priority ?? "NORMAL",
  });
  const { AuditLog } = await import("../../models/auditLog.model.js");
  await AuditLog.create({
    ...actor(a),
    action: "dispatch.message",
    resource: "dispatch",
    resourceId: doc._id.toString(),
    meta: { message: input.message, priority: input.priority, targetVehicleId: input.targetVehicleId },
    severity: input.priority === "URGENT" ? "WARN" : "INFO",
  });
  return doc.toObject();
};

export const listMessages = async (limit = 50) => {
  const docs = await DispatchMessage.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 200))
    .lean();
  return docs;
};

export const broadcastTripForceEnd = async (
  tripId: string,
  reason: string,
  a: { id?: string; role?: string }
) => {
  const trip = await Trip.findById(tripId).lean();
  if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
  const vehicleId = (trip.vehicle as { toString(): string } | undefined)?.toString() ?? "";
  broadcastTripForceEndEvent(tripId, vehicleId, reason, a.id);
  const { AuditLog } = await import("../../models/auditLog.model.js");
  await AuditLog.create({
    ...actor(a),
    action: "dispatch.trip_force_end",
    resource: "trip",
    resourceId: tripId,
    meta: { reason },
    severity: "WARN",
  });
  return { tripId, vehicleId, reason };
};