export const PAYMENT_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYABLE_FOR = ["ticket", "pass"] as const;

export interface Payment {
  _id: string;
  user: string;
  ticket: string | null;
  trip: string | null;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  providerRef: string | null;
  status: PaymentStatus;
  payableFor: "ticket" | "pass";
  metadata: Record<string, unknown>;
  confirmedAt: string | null;
  failedReason: string | null;
  refundReason: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  method?: string;
  payableFor?: string;
  from?: string;
  to?: string;
}

export const STATUS_TONE: Record<
  PaymentStatus,
  "warning" | "success" | "danger" | "neutral"
> = {
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "danger",
  REFUND_PENDING: "warning",
  REFUNDED: "neutral",
};
