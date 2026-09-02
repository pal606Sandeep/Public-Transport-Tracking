import { Types } from "mongoose";
import crypto from "crypto";
import { Payment, IPayment } from "./payment.model.js";
import { Ticket } from "../ticket/ticket.model.js";
import { Trip } from "../trip/trip.model.js";
import { broadcastToTrip } from "../../config/socket.js";
import { AppError } from "../../utils/AppError.js";

export type CreatePaymentInput = {
  ticket?: string;
  trip?: string | null;
  amount: number;
  currency?: string;
  method: string;
  provider: string;
  payableFor: "ticket" | "pass";
  metadata?: Record<string, unknown>;
};

export type WebhookInput = {
  providerRef: string;
  status: "SUCCESS" | "FAILED";
  amount?: number;
  failureReason?: string | null;
};

export const createPayment = async (
  userId: string,
  input: CreatePaymentInput
): Promise<{ payment: Record<string, unknown>; paymentReference: string }> => {
  // Validate the referenced ticket belongs to this user when payableFor === ticket.
  if (input.payableFor === "ticket" && input.ticket) {
    const ticket = await Ticket.findOne({ _id: input.ticket, user: userId }).lean();
    if (!ticket) throw AppError.notFound("Ticket not found", "TICKET_NOT_FOUND");
  }

  const providerRef = `PAY-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
  const doc = await Payment.create({
    user: new Types.ObjectId(userId),
    ticket: input.ticket ? new Types.ObjectId(input.ticket) : null,
    trip: input.trip ? new Types.ObjectId(input.trip) : null,
    amount: input.amount,
    currency: input.currency ?? "INR",
    method: input.method,
    provider: input.provider,
    providerRef,
    status: "PENDING",
    payableFor: input.payableFor,
    metadata: input.metadata ?? {},
  });

  return { payment: serializePayment(doc.toObject()), paymentReference: providerRef };
};

const QR_TTL_MS = 5 * 60 * 1000;

const upiMerchant = (): { pa: string; pn: string } => {
  const pa = process.env.UPI_MERCHANT_VPA || "transit@upi";
  const pn = process.env.UPI_MERCHANT_NAME || "Public Transit";
  return { pa, pn };
};

const buildUpiString = (amount: number, trxn: string, note: string): string => {
  const { pa, pn } = upiMerchant();
  const params = new URLSearchParams({
    pa,
    pn,
    am: String(amount),
    cu: "INR",
    tn: note,
    tr: trxn,
  });
  return `upi://pay?${params.toString()}`;
};

/**
 * Generate a conductor-facing dynamic UPI/QR payload for an onboard payment
 * (P1-45). Creates a PENDING payment bound to the trip so a gateway webhook
 * (P1-44) can confirm it; on SUCCESS the webhook emits `payment:confirmed`
 * to the `trip:{id}` Socket.IO room.
 */
export const createQrPayment = async (
  userId: string,
  input: { tripId: string; amount: number; purpose?: string }
): Promise<unknown> => {
  const trip = await Trip.findById(input.tripId).lean();
  if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");

  const purpose = input.purpose ?? "onboard payment";
  const providerRef = `QR-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + QR_TTL_MS);

  const doc = await Payment.create({
    user: new Types.ObjectId(userId),
    ticket: null,
    trip: new Types.ObjectId(input.tripId),
    amount: input.amount,
    currency: "INR",
    method: "UPI",
    provider: "upi",
    providerRef,
    status: "PENDING",
    payableFor: "ticket",
    metadata: { purpose, qr: true, expiresAt: expiresAt.toISOString() },
  });

  const upiString = buildUpiString(input.amount, providerRef, purpose);
  return {
    payment: serializePayment(doc.toObject()),
    paymentReference: providerRef,
    upiString,
    qrPayload: Buffer.from(upiString, "utf8").toString("base64"),
    amount: input.amount,
    currency: "INR",
    purpose,
    trip: String(doc.trip),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: QR_TTL_MS / 1000,
  };
};

/**
 * Webhook-based verification (P1-44). A gateway calls this with a providerRef
 * and a final status. On SUCCESS it confirms (activates) the tied ticket.
 * Replayed webhooks are idempotent — a payment already in a terminal state
 * returns the stored confirmation without double-confirming the ticket.
 */
export const handleWebhook = async (provider: string, input: WebhookInput): Promise<unknown> => {
  const payment = await Payment.findOne({
    provider: provider as never,
    providerRef: input.providerRef,
  });
  if (!payment) throw AppError.notFound("Payment not found for providerRef", "PAYMENT_NOT_FOUND");

  if (
    payment.status === "SUCCESS" ||
    payment.status === "REFUNDED" ||
    payment.status === "REFUND_PENDING"
  ) {
    return {
      payment: serializePayment(payment.toObject()),
      replayed: true,
    };
  }

  if (input.status === "SUCCESS") {
    if (typeof input.amount === "number" && input.amount !== payment.amount) {
      throw AppError.conflict(
        `Webhook amount ${input.amount} does not match payment amount ${payment.amount}`,
        "QR_AMOUNT_MISMATCH"
      );
    }
    payment.status = "SUCCESS";
    payment.confirmedAt = new Date();
    payment.metadata = { ...(payment.metadata ?? {}), amountConfirmed: input.amount ?? payment.amount };
    const tripId = payment.trip?.toString?.() ?? null;
    await payment.save();
    await confirmTicketIfPending(payment);
    if (tripId) {
      broadcastToTrip(tripId, "payment:confirmed", {
        paymentId: payment._id.toString(),
        providerRef: payment.providerRef,
        amount: input.amount ?? payment.amount,
        currency: payment.currency ?? "INR",
        purpose: (payment.metadata as Record<string, unknown> | null)?.purpose ?? null,
      });
    }
  } else {
    payment.status = "FAILED";
    payment.failedReason = input.failureReason ?? "Gateway declined";
    await payment.save();
  }

  return { payment: serializePayment(payment.toObject()), replayed: false };
};

const confirmTicketIfPending = async (payment: InstanceType<typeof Payment>): Promise<void> => {
  if (payment.payableFor !== "ticket" || !payment.ticket) return;
  const ticket = await Ticket.findById(payment.ticket);
  if (!ticket) return;
  if (ticket.status === "PENDING_PAYMENT") {
    ticket.status = "CONFIRMED";
    ticket.paymentId = payment._id;
    await ticket.save();
  }
};

export const listMyPayments = async (input: {
  userId: string;
  page: number;
  limit: number;
  status?: string;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = { user: input.userId };
  if (input.status) filter.status = input.status;
  const total = await Payment.countDocuments(filter);
  const docs = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();
  return {
    payments: docs.map(serializePayment),
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
};

export const listAllPayments = async (input: {
  page: number;
  limit: number;
  status?: string;
  method?: string;
  provider?: string;
  payableFor?: string;
  userId?: string;
  from?: string;
  to?: string;
}): Promise<unknown> => {
  const filter: Record<string, unknown> = {};
  if (input.status) filter.status = input.status;
  if (input.method) filter.method = input.method;
  if (input.provider) filter.provider = input.provider;
  if (input.payableFor) filter.payableFor = input.payableFor;
  if (input.userId) filter.user = input.userId;
  if (input.from || input.to) {
    const range: Record<string, Date> = {};
    if (input.from) range.$gte = new Date(input.from);
    if (input.to) range.$lte = new Date(input.to);
    filter.createdAt = range;
  }

  const total = await Payment.countDocuments(filter);
  const docs = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.limit)
    .limit(input.limit)
    .lean();
  return {
    payments: docs.map(serializePayment),
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
};

export const getPaymentByIdAdmin = async (id: string): Promise<unknown> => {
  const doc = await Payment.findById(id).lean();
  if (!doc) throw AppError.notFound("Payment not found", "PAYMENT_NOT_FOUND");
  return serializePayment(doc);
};

export const getPaymentById = async (userId: string, id: string): Promise<unknown> => {
  const doc = await Payment.findOne({ _id: id, user: userId }).lean();
  if (!doc) throw AppError.notFound("Payment not found", "PAYMENT_NOT_FOUND");
  return serializePayment(doc);
};

export const refundPayment = async (
  id: string,
  reason?: string | null
): Promise<unknown> => {
  const doc = await Payment.findById(id);
  if (!doc) throw AppError.notFound("Payment not found", "PAYMENT_NOT_FOUND");
  if (doc.status !== "SUCCESS")
    throw AppError.conflict("Only successful payments can be refunded", "PAYMENT_NOT_REFUNDABLE");
  doc.status = "REFUNDED";
  doc.refundedAt = new Date();
  doc.refundReason = reason ?? null;
  await doc.save();
  return { payment: serializePayment(doc.toObject()), refunded: true };
};

/* --------------------------- serializers --------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializePayment = (d: any): Record<string, unknown> => ({
  _id: d._id?.toString?.() ?? d._id,
  user: d.user?.toString?.() ?? d.user,
  ticket: d.ticket?.toString?.() ?? d.ticket ?? null,
  trip: d.trip?.toString?.() ?? d.trip ?? null,
  amount: d.amount,
  currency: d.currency ?? "INR",
  method: d.method,
  provider: d.provider,
  providerRef: d.providerRef,
  status: d.status,
  payableFor: d.payableFor,
  metadata: d.metadata ?? {},
  confirmedAt: d.confirmedAt ?? null,
  failedReason: d.failedReason ?? null,
  refundReason: d.refundReason ?? null,
  refundedAt: d.refundedAt ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export type { IPayment };
