import { Types } from "mongoose";
import { Vehicle, IVehicle } from "./vehicle.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import "../../modules/driver/driver.model.js";
import "../../modules/conductor/conductor.model.js";
import "../../modules/route/route.model.js";
import { vehicleHealth } from "../maintenance/maintenance.service.js";

export type VehicleInput = {
  registrationNumber: string;
  model?: string | null;
  type: string;
  capacity: number;
  fuelType?: string | null;
  gpsDeviceId?: string | null;
  status?: IVehicle["status"];
  assignedDriver?: string | null;
  assignedConductor?: string | null;
  assignedRoute?: string | null;
  wheelchairAccessible?: boolean;
  amenities?: Record<string, unknown> | null;
};

export type VehicleUpdate = Partial<Omit<VehicleInput, "status">> & {
  status?: IVehicle["status"];
  statusNote?: string | null;
};

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

const oid = (v?: string | null): Types.ObjectId | null => (v ? new Types.ObjectId(v) : null);

export const listVehicles = async (input: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  includeDeleted?: boolean;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = {};
  if (!input.includeDeleted) filter.deletedAt = null;
  if (input.status) filter.status = input.status;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ registrationNumber: q }, { model: q }, { type: q }];
  }

  const total = await Vehicle.countDocuments(filter);
  const docs = await Vehicle.find(filter)
    .populate("assignedDriver", "name employeeId")
    .populate("assignedConductor", "name employeeId")
    .populate("assignedRoute", "routeNumber name")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    vehicles: docs.map((d) => serializeVehicle(d, true)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getVehicleById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Vehicle.findOne(filter)
    .populate("assignedDriver", "name employeeId")
    .populate("assignedConductor", "name employeeId")
    .populate("assignedRoute", "routeNumber name")
    .lean();
  if (!doc) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");
  const health = await vehicleHealth(id);
  return { ...serializeVehicle(doc, true), documentsStatus: health.documents, serviceDue: health.serviceDue };
};

export const createVehicle = async (input: VehicleInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const exists = await Vehicle.findOne({ registrationNumber: input.registrationNumber });
  if (exists) throw AppError.conflict("Registration number already in use", "REGISTRATION_IN_USE");

  const doc = await Vehicle.create({
    registrationNumber: input.registrationNumber,
    model: input.model ?? null,
    type: input.type,
    capacity: input.capacity,
    fuelType: input.fuelType ?? null,
    gpsDeviceId: input.gpsDeviceId ?? null,
    status: input.status ?? "ACTIVE",
    assignedDriver: oid(input.assignedDriver),
    assignedConductor: oid(input.assignedConductor),
    assignedRoute: oid(input.assignedRoute),
    wheelchairAccessible: input.wheelchairAccessible ?? false,
    amenities: input.amenities ?? {},
    history: [{ at: new Date(), status: input.status ?? "ACTIVE" }],
  });

  await AuditLog.create({
    ...actor(a),
    action: "vehicle.create",
    resource: "vehicle",
    resourceId: doc._id.toString(),
    meta: { registrationNumber: doc.registrationNumber },
    severity: "WARN",
  });

  return serializeVehicle(doc.toObject(), true);
};

export const updateVehicle = async (
  id: string,
  input: VehicleUpdate,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Vehicle.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");

  if (input.registrationNumber && input.registrationNumber !== doc.registrationNumber) {
    const clash = await Vehicle.findOne({ registrationNumber: input.registrationNumber });
    if (clash) throw AppError.conflict("Registration number already in use", "REGISTRATION_IN_USE");
    doc.registrationNumber = input.registrationNumber;
  }
  if (input.model !== undefined) doc.set("model", input.model);
  if (input.type !== undefined) doc.type = input.type;
  if (input.capacity !== undefined) doc.capacity = input.capacity;
  if (input.fuelType !== undefined) doc.fuelType = input.fuelType as string;
  if (input.gpsDeviceId !== undefined) doc.gpsDeviceId = input.gpsDeviceId as string;
  if (input.wheelchairAccessible !== undefined) doc.wheelchairAccessible = input.wheelchairAccessible;
  if (input.amenities !== undefined) doc.amenities = input.amenities ?? {};
  if (input.status !== undefined && input.status !== doc.status) {
    doc.history = doc.history ?? [];
    doc.history.push({ at: new Date(), status: input.status, note: input.statusNote ?? null });
    doc.status = input.status;
  }

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "vehicle.update",
    resource: "vehicle",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeVehicle(doc.toObject(), true);
};

export const assignVehicle = async (
  id: string,
  input: { driverId?: string | null; conductorId?: string | null; routeId?: string | null },
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Vehicle.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");

  doc.assignedDriver = oid(input.driverId);
  doc.assignedConductor = oid(input.conductorId);
  doc.assignedRoute = oid(input.routeId);
  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "vehicle.assign",
    resource: "vehicle",
    resourceId: id,
    meta: { driverId: doc.assignedDriver?.toString(), conductorId: doc.assignedConductor?.toString(), routeId: doc.assignedRoute?.toString() },
    severity: "WARN",
  });

  return serializeVehicle(doc.toObject(), true);
};

export const removeVehicle = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Vehicle.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "vehicle.delete",
    resource: "vehicle",
    resourceId: id,
    severity: "WARN",
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ref = (r: any): { _id: string; name?: string; employeeId?: string; routeNumber?: string } | null => {
  if (!r) return null;
  return {
    _id: r._id?.toString?.() ?? r._id,
    name: r.name,
    employeeId: r.employeeId,
    routeNumber: r.routeNumber,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serializeVehicle = (d: any, full = false): Record<string, unknown> => {
  const out: Record<string, unknown> = {
    _id: d._id?.toString?.() ?? d._id,
    registrationNumber: d.registrationNumber,
    model: d.model ?? null,
    type: d.type,
    capacity: d.capacity,
    status: d.status ?? "ACTIVE",
    // accessibility + amenities always exposed on passenger-facing reads
    wheelchairAccessible: d.wheelchairAccessible ?? false,
    amenities: d.amenities ?? {},
    deletedAt: d.deletedAt ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  if (full) {
    out.fuelType = d.fuelType ?? null;
    out.gpsDeviceId = d.gpsDeviceId ?? null;
    out.assignedDriver = ref(d.assignedDriver);
    out.assignedConductor = ref(d.assignedConductor);
    out.assignedRoute = ref(d.assignedRoute);
    out.history = d.history ?? [];
  }
  return out;
};

export type { IVehicle };
