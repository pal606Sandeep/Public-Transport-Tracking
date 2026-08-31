import { Types } from "mongoose";
import { Stop, IStop } from "./stop.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";
import { clearRouteCache } from "../tracking/geo/geospatial.service.js";

export type StopInput = {
  name: string;
  code?: string | null;
  location: { type: "Point"; coordinates: [number, number] };
  address?: string | null;
  facilities?: (string | null)[];
  shelter?: string | null;
  accessibility?: boolean;
  nearbyLandmarks?: (string | null)[];
  routes?: string[];
  isActive?: boolean;
};

export type StopUpdate = Partial<StopInput>;

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

export const listStops = async (input: {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  near?: { lng: number; lat: number; maxDistance?: number };
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.isActive !== undefined) filter.isActive = input.isActive;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: q }, { code: q }, { address: q }];
  }

  let total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let docs: any[];
  if (input.near) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geo: any = {
      $geoNear: {
        near: { type: "Point", coordinates: [input.near.lng, input.near.lat] },
        distanceField: "distanceMeters",
        maxDistance: input.near.maxDistance ?? 5000,
        query: filter,
        spherical: true,
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agg = await Stop.aggregate([
      geo,
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    docs = (agg as any[]);
    total = await Stop.countDocuments(filter);
  } else {
    total = await Stop.countDocuments(filter);
    docs = await Stop.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  return {
    stops: docs.map(serializeStop),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getStopById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Stop.findOne(filter).populate("routes", "routeNumber name").lean();
  if (!doc) throw AppError.notFound("Stop not found", "STOP_NOT_FOUND");
  return serializeStop(doc);
};

export const createStop = async (input: StopInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  if (input.code) {
    const clash = await Stop.findOne({ code: input.code });
    if (clash) throw AppError.conflict("Stop code already in use", "STOP_CODE_IN_USE");
  }
  const doc = await Stop.create({
    name: input.name,
    code: input.code ?? null,
    location: input.location,
    address: input.address ?? null,
    facilities: input.facilities ?? [],
    shelter: input.shelter ?? null,
    accessibility: input.accessibility ?? false,
    nearbyLandmarks: input.nearbyLandmarks ?? [],
    routes: (input.routes ?? []).map((r) => new Types.ObjectId(r)),
    isActive: input.isActive ?? true,
  });

  await AuditLog.create({
    ...actor(a),
    action: "stop.create",
    resource: "stop",
    resourceId: doc._id.toString(),
    meta: { name: doc.name, code: doc.code },
    severity: "WARN",
  });

  return serializeStop(doc.toObject());
};

export const updateStop = async (id: string, input: StopUpdate, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Stop.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Stop not found", "STOP_NOT_FOUND");

  if (input.name !== undefined) doc.name = input.name;
  if (input.code !== undefined && input.code !== doc.code) {
    const clash = await Stop.findOne({ code: input.code, _id: { $ne: id } });
    if (clash) throw AppError.conflict("Stop code already in use", "STOP_CODE_IN_USE");
    doc.code = input.code;
  }
  if (input.location !== undefined) doc.location = input.location;
  if (input.address !== undefined) doc.address = input.address;
  if (input.facilities !== undefined) doc.facilities = input.facilities;
  if (input.shelter !== undefined) doc.shelter = input.shelter;
  if (input.accessibility !== undefined) doc.accessibility = input.accessibility;
  if (input.nearbyLandmarks !== undefined) doc.nearbyLandmarks = input.nearbyLandmarks;
  if (input.routes !== undefined) doc.routes = input.routes.map((r) => new Types.ObjectId(r));
  if (input.isActive !== undefined) doc.isActive = input.isActive;

  await doc.save();
  if (input.location !== undefined) clearRouteCache();

  await AuditLog.create({
    ...actor(a),
    action: "stop.update",
    resource: "stop",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeStop(doc.toObject());
};

export const deactivateStop = async (id: string, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Stop.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Stop not found", "STOP_NOT_FOUND");
  doc.isActive = false;
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "stop.deactivate",
    resource: "stop",
    resourceId: id,
    severity: "INFO",
  });
  return serializeStop(doc.toObject());
};

export const removeStop = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Stop.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Stop not found", "STOP_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "stop.delete",
    resource: "stop",
    resourceId: id,
    severity: "WARN",
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeStop = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  code: d.code ?? null,
  location: d.location,
  address: d.address ?? null,
  facilities: d.facilities ?? [],
  shelter: d.shelter ?? null,
  accessibility: d.accessibility ?? false,
  nearbyLandmarks: d.nearbyLandmarks ?? [],
  routes: (d.routes ?? []).map((r: unknown) => {
    if (typeof r === "string") return r;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rr = r as any;
    return rr?._id?.toString?.() ?? rr;
  }),
  distanceMeters: d.distanceMeters ?? undefined,
  isActive: d.isActive ?? true,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { IStop };
