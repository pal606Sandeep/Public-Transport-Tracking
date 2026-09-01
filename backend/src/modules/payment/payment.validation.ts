import { z } from "zod";

const idString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

const PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET"] as const;
const WEBHOOK_STATUSES = ["SUCCESS", "FAILED"] as const;
const PAYABLE_FOR: readonly ["ticket", "pass"] = ["ticket", "pass"];

export const createPaymentSchema = z
  .object({
    ticket: idString.optional(),
    trip: idString.nullable().optional(),
    amount: z.number().min(0),
    currency: z.string().default("INR"),
    method: z.enum(PAYMENT_METHODS).default("UPI"),
    provider: z.string().min(1).max(60),
    payableFor: z.enum(PAYABLE_FOR).default("ticket"),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const webhookSchema = z
  .object({
    providerRef: z.string().min(1).max(120),
    status: z.enum(WEBHOOK_STATUSES),
    amount: z.number().min(0).optional(),
    failureReason: z.string().max(300).nullable().optional(),
  })
  .strict();

export const refundPaymentSchema = z
  .object({
    reason: z.string().max(300).nullable().optional(),
  })
  .strict();

export const createQrSchema = z
  .object({
    tripId: idString,
    amount: z.number().min(1, "Amount must be positive"),
    purpose: z.string().min(1).max(200).default("onboard payment"),
  })
  .strict();
