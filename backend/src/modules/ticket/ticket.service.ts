import { Types } from "mongoose";
import crypto from "crypto";
import { Ticket, ITicket } from "./ticket.model.js";
import { TicketPass, ITicketPass } from "./ticketPass.model.js";
import { Route } from "../route/route.model.js";
import { Trip } from "../trip/trip.model.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import { Stop } from "../stop/stop.model.js";
import { Pass } from "../fare/pass.model.js";
import { calculateFare } from "../fare/fare.service.js";
import { assertNotBlocked } from "../passenger/passenger.service.js";
import { IdempotencyKey } from "../../models/idempotencyKey.model.js";
import { hashToken } from "../../utils/tokens.js";
import { AppError } from "../../utils/AppError.js";

export type CreateTicketInput = {
  route?: string;
  trip?: string | null;
  vehicle?: string | null;
  boardingStop?: string;
  destinationStop?: string;
  passengerCategory: string;
  concessionId?: string;
  paymentMethod?: string;
  paid?: boolean;
  distanceKm?: number;
};

export type TicketPassInput = {
  pass: string;
};

const ONLINE_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET"];

const ticketCode = (): { code: string; hint: string } => {
  const code = `TKT-${cryptoBytes(6)}`;
  return { code, hint: code.slice(-4) };
};

const cryptoBytes = (n: number): string =>
  crypto.randomBytes(n).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export const createTicket = async (
  userId: string,
  actor: { id?: string; role?: string },
  input: CreateTicketInput
): Promise<unknown> => {
  await assertNotBlocked(userId);
  const routeId = input.route;
  const boardingId = input.boardingStop;
  const destId = input.destinationStop;

  if (!routeId) throw AppError.badRequest("route is required", "ROUTE_REQUIRED");
  if (!boardingId || !destId)
    throw AppError.badRequest("boardingStop and destinationStop are required", "STOPS_REQUIRED");

  const route = await Route.findOne({ _id: routeId, deletedAt: null }).lean();
  if (!route) throw AppError.notFound("Route not found", "ROUTE_NOT_FOUND");

  // Resolve vehicle + trip (for denormalized reg no + expiry window).
  let vehicleRegNo: string | null = null;
  let vehicleId: Types.ObjectId | null = null;
  if (input.vehicle) {
    const vehicle = await Vehicle.findById(input.vehicle).lean();
    if (vehicle) {
      vehicleRegNo = vehicle.registrationNumber;
      vehicleId = vehicle._id;
    }
  }

  let expiresAt: Date | null = null;
  if (input.trip) {
    const trip = await Trip.findById(input.trip).lean();
    if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
    expiresAt = trip.scheduledEndAt ?? new Date(Date.now() + 60 * 60 * 1000);
  } else {
    expiresAt = new Date(Date.now() + (route.estimatedDurationMin ?? 60) * 60 * 1000);
  }

  // Compute fare (single source of truth).
  const fare = (await calculateFare({
    routeId,
    boardingStopId: boardingId,
    destinationStopId: destId,
    passengerCategory: input.passengerCategory as
      | "ADULT"
      | "CHILD"
      | "STUDENT"
      | "SENIOR"
      | "DISABLED"
      | "VETERAN",
    concessionId: input.concessionId,
    distanceKm: input.distanceKm,
  })) as {
    amount: number;
    currency: string;
    boardingStopId: string;
    destinationStopId: string;
    stopsSpanned: number;
    passengerCategory: string;
    appliedConcession: {
      id: string;
      discountPercent: number;
      category: string;
    } | null;
  };

  // Active pass covers the fare → amount 0.
  const applicablePass = await findApplicablePass(userId);
  const passCovered = !!applicablePass;
  const amount = passCovered ? 0 : fare.amount;

  const { code, hint } = ticketCode();
  const paid = input.paid || !ONLINE_METHODS.includes((input.paymentMethod ?? "CASH").toUpperCase());
  const status: ITicket["status"] = paid || passCovered ? "CONFIRMED" : "PENDING_PAYMENT";

  const [boardingName, destName] = await Promise.all([
    boardingId ? Stop.findById(boardingId).select("name").lean() : null,
    destId ? Stop.findById(destId).select("name").lean() : null,
  ]);

  const doc = await Ticket.create({
    user: new Types.ObjectId(userId),
    ticketCodeHash: hashToken(code),
    ticketCodeHint: hint,
    route: route._id,
    routeNumber: route.routeNumber,
    vehicle: vehicleId,
    vehicleRegNo,
    trip: input.trip ? new Types.ObjectId(input.trip) : null,
    boardingStop: boardingId ? new Types.ObjectId(boardingId) : null,
    destinationStop: destId ? new Types.ObjectId(destId) : null,
    boardingStopName: boardingName?.name ?? null,
    destinationStopName: destName?.name ?? null,
    passengerCategory: input.passengerCategory,
    amount,
    currency: fare.currency,
    paymentMethod: (input.paymentMethod ?? "CASH").toUpperCase(),
    status,
    issuedBy: actor.id ? new Types.ObjectId(actor.id) : null,
    issuedByRole: actor.role ?? null,
    passId: applicablePass ? applicablePass.pass : null,
    passType: applicablePass ? applicablePass.type : null,
    expiresAt,
    paymentId: null,
  });

  return {
    ...serializeTicket(doc.toObject()),
    ticketCode: code,
  };
};

/* --------------------------- conductor offline bulk (P1-46) --------------------------- */

export type BulkTicketItem = CreateTicketInput & {
  idempotencyKey: string;
  issuedAt?: string;
};

export type BulkTicketResult = {
  index: number;
  idempotencyKey: string;
  status: "created" | "replayed";
  issuedAt?: string | null;
  ticket?: Record<string, unknown>;
  error?: { code: string; message: string } | null;
};

/**
 * Conductor offline sync — bulk ticket issue (P1-46). Each item carries its own
 * client Idempotency-Key. Items are de-duplicated per (user, key), timestamp-
 * validated, sorted by issuedAt, and processed in order. A replayed key returns
 * the stored per-item result (never a duplicate ticket).
 */
export const createTicketsBulk = async (
  userId: string,
  actor: { id?: string; role?: string },
  input: { items: BulkTicketItem[] }
): Promise<unknown> => {
  const now = Date.now();
  const ordered = input.items
    .map((it, index) => ({ it, index }))
    .sort((a, b) => {
      const ta = a.it.issuedAt ? new Date(a.it.issuedAt).getTime() : 0;
      const tb = b.it.issuedAt ? new Date(b.it.issuedAt).getTime() : 0;
      return ta - tb;
    });

  const results: BulkTicketResult[] = [];
  let created = 0;
  let replayed = 0;
  let failed = 0;

  for (const { it, index } of ordered) {
    const key = `user:${userId}:ticket-bulk:${it.idempotencyKey}`;
    const existing = await IdempotencyKey.findOne({ key, scope: "ticket-bulk" });
    if (existing) {
      replayed += 1;
      results.push({ ...(existing.body as BulkTicketResult), status: "replayed" });
      continue;
    }

    if (it.issuedAt) {
      const t = new Date(it.issuedAt);
      if (Number.isNaN(t.getTime()))
        throw AppError.badRequest(`Invalid issuedAt for item ${index}`, "INVALID_TIMESTAMP");
      const ms = t.getTime();
      if (ms > now + 60_000)
        throw AppError.badRequest(`issuedAt in the future for item ${index}`, "TIMESTAMP_IN_FUTURE");
      if (ms < now - 7 * 24 * 60 * 60 * 1000)
        throw AppError.badRequest(`issuedAt too old for item ${index}`, "TIMESTAMP_TOO_OLD");
    }

    let result: BulkTicketResult;
    try {
      const ticket = (await createTicket(userId, actor, it)) as Record<string, unknown>;
      result = {
        index,
        idempotencyKey: it.idempotencyKey,
        status: "created",
        issuedAt: it.issuedAt ?? null,
        ticket,
      };
      created += 1;
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      result = {
        index,
        idempotencyKey: it.idempotencyKey,
        status: "created",
        issuedAt: it.issuedAt ?? null,
        error: { code: e?.code ?? "ERROR", message: e?.message ?? String(e) },
      };
      failed += 1;
    }

    await IdempotencyKey.create({ key, scope: "ticket-bulk", statusCode: 200, body: result });
    results.push(result);
  }

  return {
    results,
    summary: { total: results.length, created, replayed, failed },
  };
};

/* --------------------------- read / search --------------------------- */

export const listMyTickets = async (input: {
  userId: string;
  page: number;
  limit: number;
  status?: string;
  search?: string;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = { user: input.userId };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const q = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ routeNumber: q }, { ticketCodeHint: q }];
  }

  const total = await Ticket.countDocuments(filter);
  const docs = await Ticket.find(filter)
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();

  return {
    tickets: docs.map(serializeTicket),
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
};

export const getTicketById = async (userId: string, id: string): Promise<unknown> => {
  const doc = await Ticket.findOne({ _id: id, user: userId }).lean();
  if (!doc) throw AppError.notFound("Ticket not found", "TICKET_NOT_FOUND");
  return serializeTicket(doc);
};

/* --------------------------- validate (QR) --------------------------- */

export const validateTicket = async (input: {
  id?: string;
  ticketCode?: string;
}): Promise<unknown> => {
  if (input.id) {
    const doc = await Ticket.findById(input.id);
    if (!doc) throw AppError.notFound("Ticket not found", "TICKET_NOT_FOUND");
    return validateDoc(doc);
  }
  if (input.ticketCode) {
    const hash = hashToken(input.ticketCode);
    const doc = await Ticket.findOne({ ticketCodeHash: hash });
    if (!doc) throw AppError.badRequest("Invalid ticket code", "INVALID_TICKET_CODE");
    return validateDoc(doc);
  }
  throw AppError.badRequest("id or ticketCode required", "VALIDATION_INPUT_REQUIRED");
};

const validateDoc = async (doc: InstanceType<typeof Ticket>): Promise<unknown> => {
  if (doc.status === "USED")
    throw AppError.conflict("Ticket already used", "TICKET_ALREADY_USED");
  if (doc.status === "CANCELLED")
    throw AppError.conflict("Ticket is cancelled", "TICKET_CANCELLED");
  if (doc.status === "EXPIRED" || (doc.expiresAt && doc.expiresAt < new Date())) {
    doc.status = "EXPIRED";
    await doc.save();
    throw AppError.badRequest("Ticket has expired", "TICKET_EXPIRED");
  }
  if (doc.status === "PENDING_PAYMENT")
    throw AppError.badRequest("Ticket payment is pending", "PAYMENT_PENDING");
  if (doc.status !== "CONFIRMED")
    throw AppError.badRequest("Ticket is not valid", "TICKET_NOT_VALID");

  doc.status = "USED";
  doc.usedAt = new Date();
  await doc.save();
  return { ...serializeTicket(doc.toObject()), result: "valid", action: "used" };
};

/* --------------------------- cancel --------------------------- */

export const cancelTicket = async (
  userId: string,
  id: string,
  reason?: string | null
): Promise<unknown> => {
  const doc = await Ticket.findOne({ _id: id, user: userId });
  if (!doc) throw AppError.notFound("Ticket not found", "TICKET_NOT_FOUND");
  if (doc.status === "USED")
    throw AppError.conflict("Used tickets cannot be cancelled", "TICKET_ALREADY_USED");
  if (doc.status === "CANCELLED")
    throw AppError.conflict("Ticket already cancelled", "TICKET_ALREADY_CANCELLED");
  if (doc.status === "EXPIRED" || (doc.expiresAt && doc.expiresAt < new Date())) {
    doc.status = "EXPIRED";
    await doc.save();
    throw AppError.badRequest("Ticket has expired", "TICKET_EXPIRED");
  }

  doc.status = "CANCELLED";
  doc.cancelledAt = new Date();
  doc.cancelledReason = reason ?? null;
  await doc.save();
  return serializeTicket(doc.toObject());
};

/* --------------------------- passes --------------------------- */

export const purchasePass = async (
  userId: string,
  input: TicketPassInput
): Promise<unknown> => {
  await assertNotBlocked(userId);
  const pass = await Pass.findOne({ _id: input.pass, deletedAt: null, isActive: true }).lean();
  if (!pass) throw AppError.notFound("Pass not found or inactive", "PASS_NOT_FOUND");
  const now = new Date();
  if (pass.validFrom && pass.validFrom > now)
    throw AppError.badRequest("Pass is not yet valid", "PASS_NOT_ACTIVE");
  if (pass.validTo && pass.validTo < now)
    throw AppError.badRequest("Pass is no longer valid", "PASS_EXPIRED");

  const expiresAt =
    pass.durationDays != null
      ? new Date(now.getTime() + pass.durationDays * 24 * 60 * 60 * 1000)
      : pass.validTo ?? null;

  const doc = await TicketPass.create({
    user: new Types.ObjectId(userId),
    pass: pass._id,
    passName: pass.name,
    type: pass.type,
    price: pass.price,
    currency: pass.currency,
    status: "ACTIVE",
    purchasedAt: now,
    validFrom: pass.validFrom ?? now,
    expiresAt,
    durationDays: pass.durationDays ?? null,
    unlimited: pass.unlimited ?? true,
    usedCount: 0,
  });

  return serializePass(doc.toObject());
};

export const listMyPasses = async (userId: string): Promise<unknown> => {
  const docs = await TicketPass.find({ user: userId }).sort({ purchasedAt: -1 }).lean();
  return { passes: docs.map(serializePass) };
};

export const getMyActivePass = async (userId: string): Promise<unknown | null> => {
  const pass = await findApplicablePass(userId);
  return pass ? serializePass(pass) : null;
};

const findApplicablePass = async (userId: string): Promise<ITicketPass | null> => {
  const now = new Date();
  const doc = await TicketPass.findOne({
    user: userId,
    status: "ACTIVE",
    $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
  }).sort({ expiresAt: 1 }).lean();
  if (!doc || doc.unlimited === false) return null;
  if (doc.expiresAt && doc.expiresAt < now) return null;
  return doc;
};

/* --------------------------- serializers --------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeTicket = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  user: d.user?.toString?.() ?? d.user,
  ticketCodeHint: d.ticketCodeHint,
  route: d.route?.toString?.() ?? d.route,
  routeNumber: d.routeNumber,
  vehicle: d.vehicle?.toString?.() ?? d.vehicle ?? null,
  vehicleRegNo: d.vehicleRegNo ?? null,
  trip: d.trip?.toString?.() ?? d.trip ?? null,
  boardingStop: d.boardingStop?.toString?.() ?? d.boardingStop ?? null,
  destinationStop: d.destinationStop?.toString?.() ?? d.destinationStop ?? null,
  boardingStopName: d.boardingStopName ?? null,
  destinationStopName: d.destinationStopName ?? null,
  passengerCategory: d.passengerCategory,
  amount: d.amount,
  currency: d.currency ?? "INR",
  paymentMethod: d.paymentMethod,
  status: d.status,
  issuedBy: d.issuedBy?.toString?.() ?? d.issuedBy ?? null,
  issuedByRole: d.issuedByRole ?? null,
  passId: d.passId?.toString?.() ?? d.passId ?? null,
  passType: d.passType ?? null,
  expiresAt: d.expiresAt ?? null,
  usedAt: d.usedAt ?? null,
  cancelledAt: d.cancelledAt ?? null,
  cancelledReason: d.cancelledReason ?? null,
  paymentId: d.paymentId?.toString?.() ?? d.paymentId ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializePass = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  user: d.user?.toString?.() ?? d.user,
  pass: d.pass?.toString?.() ?? d.pass,
  passName: d.passName,
  type: d.type,
  price: d.price,
  currency: d.currency ?? "INR",
  status: d.status,
  purchasedAt: d.purchasedAt,
  validFrom: d.validFrom ?? null,
  expiresAt: d.expiresAt ?? null,
  durationDays: d.durationDays ?? null,
  unlimited: d.unlimited ?? true,
  usedCount: d.usedCount ?? 0,
  cancelledAt: d.cancelledAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});
