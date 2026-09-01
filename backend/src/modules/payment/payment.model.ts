import mongoose, { Types } from "mongoose";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUND_PENDING" | "REFUNDED";

export type PaymentMethod = "UPI" | "CARD" | "NET_BANKING" | "WALLET";

export interface IPayment {
  user: Types.ObjectId;
  ticket?: Types.ObjectId | null;
  trip?: Types.ObjectId | null;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  providerRef?: string | null;
  status: PaymentStatus;
  idempotencyKey?: string | null;
  payableFor: "ticket" | "pass";
  metadata?: Record<string, unknown> | null;
  confirmedAt?: Date | null;
  failedReason?: string | null;
  refundReason?: string | null;
  refundedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new mongoose.Schema<IPayment>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    method: {
      type: String,
      enum: ["UPI", "CARD", "NET_BANKING", "WALLET"],
      default: "UPI",
    },
    provider: { type: String, required: true },
    providerRef: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUND_PENDING", "REFUNDED"],
      default: "PENDING",
    },
    idempotencyKey: { type: String, default: null },
    payableFor: { type: String, enum: ["ticket", "pass"], default: "ticket" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    confirmedAt: { type: Date, default: null },
    failedReason: { type: String, default: null },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ providerRef: 1 });

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
