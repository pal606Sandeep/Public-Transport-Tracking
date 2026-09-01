import { Types } from "mongoose";
import { Fare, IFare } from "./fare.model.js";
import { FareRule, IFareRule } from "./fareRule.model.js";
import { Concession, IConcession } from "./concession.model.js";
import { Pass, IPass } from "./pass.model.js";
import { Route } from "../route/route.model.js";
import { Stop } from "../stop/stop.model.js";
import { AuditLog } from "../../models/auditLog.model.js";
import { AppError } from "../../utils/AppError.js";

export type FareInput = {
  name: string;
  type: IFare["type"];
  isActive?: boolean;
  route?: string | null;
  fromStop?: string | null;
  toStop?: string | null;
  amount: number;
  distanceFromKm?: number | null;
  distanceToKm?: number | null;
  priority?: number;
};

export type FareUpdate = Partial<Omit<FareInput, "type">> & { type?: IFare["type"] };

export type FareRuleInput = {
  name: string;
  description?: string | null;
  baseFare: number;
  perStopFare: number;
  perKmFare?: number | null;
  minimumFare?: number | null;
  currency?: string;
  acceptedPaymentMethods?: string[];
  isActive?: boolean;
};

export type ConcessionInput = {
  name: string;
  code: string;
  type: IConcession["type"];
  discountPercent: number;
  isActive?: boolean;
  validFrom?: Date | null;
  validTo?: Date | null;
  maxPerDay?: number | null;
};

export type PassInput = {
  name: string;
  type: IPass["type"];
  price: number;
  currency?: string;
  durationDays?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  isActive?: boolean;
  unlimited?: boolean;
};

const actor = (a?: { id?: string; role?: string }) => ({ actorId: a?.id ?? null, actorRole: a?.role ?? null });

/* ----------------------------- Fares ----------------------------- */

export const listFares = async (input: {
  page: number;
  limit: number;
  type?: string;
  isActive?: string;
  search?: string;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.type) filter.type = input.type;
  if (input.isActive !== undefined) filter.isActive = input.isActive === "true";
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.name = q;
  }

  const total = await Fare.countDocuments(filter);
  const docs = await Fare.find(filter)
    .sort({ priority: 1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    fares: docs.map(serializeFare),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getFareById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Fare.findOne(filter)
    .populate("route", "name routeNumber source destination")
    .populate("fromStop", "name code")
    .populate("toStop", "name code")
    .lean();
  if (!doc) throw AppError.notFound("Fare not found", "FARE_NOT_FOUND");
  return serializeFare(doc);
};

export const createFare = async (input: FareInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Fare.create({
    name: input.name,
    type: input.type,
    isActive: input.isActive ?? true,
    route: input.route ? new Types.ObjectId(input.route) : null,
    fromStop: input.fromStop ? new Types.ObjectId(input.fromStop) : null,
    toStop: input.toStop ? new Types.ObjectId(input.toStop) : null,
    amount: input.amount,
    distanceFromKm: input.distanceFromKm ?? null,
    distanceToKm: input.distanceToKm ?? null,
    priority: input.priority ?? 0,
  });

  await AuditLog.create({
    ...actor(a),
    action: "fare.create",
    resource: "fare",
    resourceId: doc._id.toString(),
    meta: { name: doc.name, type: doc.type, amount: doc.amount },
    severity: "INFO",
  });

  return serializeFare(doc.toObject());
};

export const updateFare = async (
  id: string,
  input: FareUpdate,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Fare.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Fare not found", "FARE_NOT_FOUND");

  if (input.name !== undefined) doc.name = input.name;
  if (input.type !== undefined) doc.type = input.type;
  if (input.isActive !== undefined) doc.isActive = input.isActive;
  if (input.route !== undefined) doc.route = input.route ? new Types.ObjectId(input.route) : null;
  if (input.fromStop !== undefined) doc.fromStop = input.fromStop ? new Types.ObjectId(input.fromStop) : null;
  if (input.toStop !== undefined) doc.toStop = input.toStop ? new Types.ObjectId(input.toStop) : null;
  if (input.amount !== undefined) doc.amount = input.amount;
  if (input.distanceFromKm !== undefined) doc.distanceFromKm = input.distanceFromKm ?? null;
  if (input.distanceToKm !== undefined) doc.distanceToKm = input.distanceToKm ?? null;
  if (input.priority !== undefined) doc.priority = input.priority;

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "fare.update",
    resource: "fare",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeFare(doc.toObject());
};

export const removeFare = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Fare.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Fare not found", "FARE_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "fare.delete",
    resource: "fare",
    resourceId: id,
    severity: "WARN",
  });
};

/* --------------------------- Fare Rules --------------------------- */

export const listFareRules = async (): Promise<unknown> => {
  const docs = await FareRule.find({ deletedAt: null, isActive: true }).sort({ createdAt: -1 }).lean();
  return { fareRules: docs.map(serializeFareRule) };
};

export const getFareRuleById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await FareRule.findOne(filter).lean();
  if (!doc) throw AppError.notFound("Fare rule not found", "FARE_RULE_NOT_FOUND");
  return serializeFareRule(doc);
};

export const createFareRule = async (
  input: FareRuleInput,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await FareRule.create({
    name: input.name,
    description: input.description ?? null,
    baseFare: input.baseFare,
    perStopFare: input.perStopFare,
    perKmFare: input.perKmFare ?? null,
    minimumFare: input.minimumFare ?? null,
    currency: input.currency ?? "INR",
    acceptedPaymentMethods: input.acceptedPaymentMethods ?? ["QR", "CASH", "CARD", "UPI"],
    isActive: input.isActive ?? true,
  });

  await AuditLog.create({
    ...actor(a),
    action: "fareRule.create",
    resource: "fareRule",
    resourceId: doc._id.toString(),
    meta: { name: doc.name },
    severity: "INFO",
  });

  return serializeFareRule(doc.toObject());
};

export const updateFareRule = async (
  id: string,
  input: Partial<FareRuleInput>,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await FareRule.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Fare rule not found", "FARE_RULE_NOT_FOUND");

  if (input.name !== undefined) doc.name = input.name;
  if (input.description !== undefined) doc.description = input.description ?? null;
  if (input.baseFare !== undefined) doc.baseFare = input.baseFare;
  if (input.perStopFare !== undefined) doc.perStopFare = input.perStopFare;
  if (input.perKmFare !== undefined) doc.perKmFare = input.perKmFare ?? null;
  if (input.minimumFare !== undefined) doc.minimumFare = input.minimumFare ?? null;
  if (input.currency !== undefined) doc.currency = input.currency;
  if (input.acceptedPaymentMethods !== undefined) doc.acceptedPaymentMethods = input.acceptedPaymentMethods;
  if (input.isActive !== undefined) doc.isActive = input.isActive;

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "fareRule.update",
    resource: "fareRule",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeFareRule(doc.toObject());
};

export const removeFareRule = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await FareRule.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Fare rule not found", "FARE_RULE_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "fareRule.delete",
    resource: "fareRule",
    resourceId: id,
    severity: "WARN",
  });
};

/* --------------------------- Concessions --------------------------- */

export const listConcessions = async (input: {
  page: number;
  limit: number;
  type?: string;
  isActive?: string;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.type) filter.type = input.type;
  if (input.isActive !== undefined) filter.isActive = input.isActive === "true";

  const total = await Concession.countDocuments(filter);
  const docs = await Concession.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    concessions: docs.map(serializeConcession),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getConcessionById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Concession.findOne(filter).lean();
  if (!doc) throw AppError.notFound("Concession not found", "CONCESSION_NOT_FOUND");
  return serializeConcession(doc);
};

export const createConcession = async (
  input: ConcessionInput,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const exists = await Concession.findOne({ code: input.code });
  if (exists) throw AppError.conflict("Concession code already in use", "CONCESSION_CODE_IN_USE");

  const doc = await Concession.create({
    name: input.name,
    code: input.code,
    type: input.type,
    discountPercent: input.discountPercent,
    isActive: input.isActive ?? true,
    validFrom: input.validFrom ?? null,
    validTo: input.validTo ?? null,
    maxPerDay: input.maxPerDay ?? null,
  });

  await AuditLog.create({
    ...actor(a),
    action: "concession.create",
    resource: "concession",
    resourceId: doc._id.toString(),
    meta: { code: doc.code },
    severity: "INFO",
  });

  return serializeConcession(doc.toObject());
};

export const updateConcession = async (
  id: string,
  input: Partial<ConcessionInput>,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Concession.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Concession not found", "CONCESSION_NOT_FOUND");

  if (input.code && input.code !== doc.code) {
    const clash = await Concession.findOne({ code: input.code });
    if (clash) throw AppError.conflict("Concession code already in use", "CONCESSION_CODE_IN_USE");
    doc.code = input.code;
  }
  if (input.name !== undefined) doc.name = input.name;
  if (input.type !== undefined) doc.type = input.type;
  if (input.discountPercent !== undefined) doc.discountPercent = input.discountPercent;
  if (input.isActive !== undefined) doc.isActive = input.isActive;
  if (input.validFrom !== undefined) doc.validFrom = input.validFrom ?? null;
  if (input.validTo !== undefined) doc.validTo = input.validTo ?? null;
  if (input.maxPerDay !== undefined) doc.maxPerDay = input.maxPerDay ?? null;

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "concession.update",
    resource: "concession",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializeConcession(doc.toObject());
};

export const removeConcession = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Concession.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Concession not found", "CONCESSION_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "concession.delete",
    resource: "concession",
    resourceId: id,
    severity: "WARN",
  });
};

/* ----------------------------- Passes ----------------------------- */

export const listPasses = async (input: {
  page: number;
  limit: number;
  type?: string;
  isActive?: string;
}): Promise<unknown> => {
  const page = input.page;
  const limit = input.limit;
  const filter: Record<string, unknown> = { deletedAt: null };
  if (input.type) filter.type = input.type;
  if (input.isActive !== undefined) filter.isActive = input.isActive === "true";

  const total = await Pass.countDocuments(filter);
  const docs = await Pass.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    passes: docs.map(serializePass),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getPassById = async (id: string, includeDeleted = false): Promise<unknown> => {
  const filter: Record<string, unknown> = { _id: id };
  if (!includeDeleted) filter.deletedAt = null;
  const doc = await Pass.findOne(filter).lean();
  if (!doc) throw AppError.notFound("Pass not found", "PASS_NOT_FOUND");
  return serializePass(doc);
};

export const createPass = async (input: PassInput, a?: { id?: string; role?: string }): Promise<unknown> => {
  const doc = await Pass.create({
    name: input.name,
    type: input.type,
    price: input.price,
    currency: input.currency ?? "INR",
    durationDays: input.durationDays ?? null,
    validFrom: input.validFrom ?? null,
    validTo: input.validTo ?? null,
    isActive: input.isActive ?? true,
    unlimited: input.unlimited ?? true,
  });

  await AuditLog.create({
    ...actor(a),
    action: "pass.create",
    resource: "pass",
    resourceId: doc._id.toString(),
    meta: { name: doc.name, type: doc.type, price: doc.price },
    severity: "INFO",
  });

  return serializePass(doc.toObject());
};

export const updatePass = async (
  id: string,
  input: Partial<PassInput>,
  a?: { id?: string; role?: string }
): Promise<unknown> => {
  const doc = await Pass.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Pass not found", "PASS_NOT_FOUND");

  if (input.name !== undefined) doc.name = input.name;
  if (input.type !== undefined) doc.type = input.type;
  if (input.price !== undefined) doc.price = input.price;
  if (input.currency !== undefined) doc.currency = input.currency;
  if (input.durationDays !== undefined) doc.durationDays = input.durationDays ?? null;
  if (input.validFrom !== undefined) doc.validFrom = input.validFrom ?? null;
  if (input.validTo !== undefined) doc.validTo = input.validTo ?? null;
  if (input.isActive !== undefined) doc.isActive = input.isActive;
  if (input.unlimited !== undefined) doc.unlimited = input.unlimited;

  await doc.save();

  await AuditLog.create({
    ...actor(a),
    action: "pass.update",
    resource: "pass",
    resourceId: id,
    meta: { fields: Object.keys(input) },
    severity: "INFO",
  });

  return serializePass(doc.toObject());
};

export const removePass = async (id: string, a?: { id?: string; role?: string }): Promise<void> => {
  const doc = await Pass.findById(id);
  if (!doc || doc.deletedAt) throw AppError.notFound("Pass not found", "PASS_NOT_FOUND");
  doc.deletedAt = new Date();
  await doc.save();
  await AuditLog.create({
    ...actor(a),
    action: "pass.delete",
    resource: "pass",
    resourceId: id,
    severity: "WARN",
  });
};

/* --------------------------- Fare calculation (P1-42) --------------------------- */

export type CalculateFareInput = {
  routeId?: string;
  boardingStopId: string;
  destinationStopId: string;
  passengerCategory: "ADULT" | "CHILD" | "STUDENT" | "SENIOR" | "DISABLED" | "VETERAN";
  concessionId?: string;
  distanceKm?: number;
};

export const calculateFare = async (input: CalculateFareInput): Promise<unknown> => {
  const boardingId = input.boardingStopId;
  const destId = input.destinationStopId;
  if (boardingId === destId)
    throw AppError.badRequest("Boarding and destination must be different stops", "SAME_STOP");

  const [boardingStop, destStop] = await Promise.all([
    Stop.findById(boardingId).lean(),
    Stop.findById(destId).lean(),
  ]);
  if (!boardingStop) throw AppError.badRequest("Boarding stop not found", "STOP_NOT_FOUND");
  if (!destStop) throw AppError.badRequest("Destination stop not found", "STOP_NOT_FOUND");

  // Resolve the route serving both stops in order (source → destination).
  let route = null;
  if (input.routeId) {
    route = await Route.findOne({ _id: input.routeId, deletedAt: null, status: "ACTIVE" }).lean();
  } else {
    route = await findRouteForStops(boardingId, destId);
  }
  if (!route) throw AppError.badRequest("No route for this stop pair (or route inactive)", "NO_ROUTE");

  const seqById = new Map<string, number>(
    (route.orderedStops ?? []).map((s) => [s.stopId.toString(), s.sequence])
  );
  const fromSeq = seqById.get(boardingId);
  const toSeq = seqById.get(destId);
  if (fromSeq === undefined || toSeq === undefined || fromSeq >= toSeq)
    throw AppError.badRequest("Boarding stop is not before destination on this route", "INVALID_STOP_ORDER");
  const stopsSpanned = toSeq - fromSeq;

  const distanceKm = input.distanceKm ?? route.distanceKm ?? undefined;

  // Priority-ordered fare lookup.
  const lookup = await resolveFareAmount(route._id.toString(), stopsSpanned, distanceKm);
  const baseAmount = lookup.amount;
  const currency = lookup.currency;

  // Concession application.
  let appliedConcession: Record<string, unknown> | null = null;
  let finalAmount = baseAmount;
  if (input.concessionId) {
    const conc = await Concession.findById(input.concessionId).lean();
    if (!conc) throw AppError.badRequest("Concession not found", "CONCESSION_NOT_FOUND");
    const now = new Date();
    const inWindow = (!conc.validFrom || conc.validFrom <= now) && (!conc.validTo || conc.validTo >= now);
    if (!inWindow) throw AppError.badRequest("Concession is not currently valid", "CONCESSION_EXPIRED");
    finalAmount = Math.max(0, Math.round(baseAmount * (1 - conc.discountPercent / 100)));
    appliedConcession = {
      id: conc._id.toString(),
      code: conc.code,
      name: conc.name,
      type: conc.type,
      discountPercent: conc.discountPercent,
      category: input.passengerCategory,
    };
  }

  return {
    routeId: route._id.toString(),
    routeNumber: route.routeNumber ?? null,
    boardingStopId: boardingId,
    destinationStopId: destId,
    stopsSpanned,
    distanceKm: distanceKm ?? null,
    passengerCategory: input.passengerCategory,
    amount: finalAmount,
    currency,
    breakdown: lookup.breakdown,
    appliedConcession,
  };
};

/** Pick the active Fare with the highest precedence for the route/stop-pair/distance. */
const resolveFareAmount = async (
  routeId: string,
  stopsSpanned: number,
  distanceKm?: number
): Promise<{ amount: number; currency: string; breakdown: Record<string, unknown> }> => {
  const fare = await Fare.find({ deletedAt: null, isActive: true })
    .sort({ priority: -1, createdAt: 1 })
    .lean();

  // 1. Route-specific fare.
  const routeFare = fare.find((f) => f.type === "ROUTE" && f.route?.toString() === routeId);
  if (routeFare) {
    return {
      amount: routeFare.amount,
      currency: "INR",
      breakdown: { baseAmount: routeFare.amount, rule: "route", name: routeFare.name, stopsSpanned },
    };
  }

  // 2. Distance/stage fare by distance band.
  if (distanceKm !== undefined) {
    const distanceFare = fare.find(
      (f) =>
        f.type === "DISTANCE" &&
        (f.distanceFromKm == null || distanceKm >= f.distanceFromKm) &&
        (f.distanceToKm == null || distanceKm <= f.distanceToKm)
    );
    if (distanceFare) {
      return {
        amount: distanceFare.amount,
        currency: "INR",
        breakdown: {
          baseAmount: distanceFare.amount,
          rule: "distance",
          name: distanceFare.name,
          distanceKm,
          distanceFromKm: distanceFare.distanceFromKm,
          distanceToKm: distanceFare.distanceToKm,
        },
      };
    }
  }

  // 3. Stage fare (per-stop band).
  const stageFare = fare.find(
    (f) =>
      f.type === "STAGE" &&
      (f.distanceFromKm == null || stopsSpanned >= f.distanceFromKm) &&
      (f.distanceToKm == null || stopsSpanned <= f.distanceToKm)
  );
  if (stageFare) {
    return {
      amount: stageFare.amount,
      currency: "INR",
      breakdown: {
        baseAmount: stageFare.amount,
        rule: "stage",
        name: stageFare.name,
        stopsSpanned,
        distanceFromKm: stageFare.distanceFromKm,
        distanceToKm: stageFare.distanceToKm,
      },
    };
  }

  // 4. Fall back to the active FareRule (base + per-stop), else a documented default.
  const rule = await FareRule.findOne({ deletedAt: null, isActive: true }).sort({ createdAt: 1 }).lean();
  const baseAmount = rule?.baseFare ?? 10;
  const perStop = rule?.perStopFare ?? 2;
  const amount = baseAmount + perStop * stopsSpanned;
  return {
    amount,
    currency: rule?.currency ?? "INR",
    breakdown: {
      baseFare: baseAmount,
      perStopFare: perStop,
      stopsSpanned,
      rule: "fareRule",
      name: rule?.name ?? "Default",
      formula: "baseFare + perStopFare * stopsSpanned",
    },
  };
};

const findRouteForStops = async (
  boardingId: string,
  destId: string
): Promise<{
  _id: Types.ObjectId;
  routeNumber?: string | null;
  orderedStops?: Array<{ stopId: Types.ObjectId; sequence: number }>;
  distanceKm?: number | null;
} | null> => {
  const routes = await Route.find({ deletedAt: null, status: "ACTIVE" }).lean();
  for (const r of routes) {
    const seq = new Map<string, number>((r.orderedStops ?? []).map((s) => [s.stopId.toString(), s.sequence]));
    const a = seq.get(boardingId);
    const b = seq.get(destId);
    if (a !== undefined && b !== undefined && a < b) return r;
  }
  return null;
};

/* --------------------------- serializers --------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeFare = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  type: d.type,
  isActive: d.isActive ?? true,
  route: d.route?.toString?.() ?? d.route ?? null,
  fromStop: d.fromStop?.toString?.() ?? d.fromStop ?? null,
  toStop: d.toStop?.toString?.() ?? d.toStop ?? null,
  amount: d.amount,
  distanceFromKm: d.distanceFromKm ?? null,
  distanceToKm: d.distanceToKm ?? null,
  priority: d.priority ?? 0,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeFareRule = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  description: d.description ?? null,
  baseFare: d.baseFare,
  perStopFare: d.perStopFare,
  perKmFare: d.perKmFare ?? null,
  minimumFare: d.minimumFare ?? null,
  currency: d.currency ?? "INR",
  acceptedPaymentMethods: d.acceptedPaymentMethods ?? ["QR", "CASH", "CARD", "UPI"],
  isActive: d.isActive ?? true,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeConcession = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  code: d.code,
  type: d.type,
  discountPercent: d.discountPercent,
  isActive: d.isActive ?? true,
  validFrom: d.validFrom ?? null,
  validTo: d.validTo ?? null,
  maxPerDay: d.maxPerDay ?? null,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializePass = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  name: d.name,
  type: d.type,
  price: d.price,
  currency: d.currency ?? "INR",
  durationDays: d.durationDays ?? null,
  validFrom: d.validFrom ?? null,
  validTo: d.validTo ?? null,
  isActive: d.isActive ?? true,
  unlimited: d.unlimited ?? true,
  deletedAt: d.deletedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
