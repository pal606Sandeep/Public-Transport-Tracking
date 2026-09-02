import type { PassengerCategory } from "@/modules/conductor/constant/conductor.types";

export type { PassengerCategory };
export { PASSENGER_CATEGORIES } from "@/modules/conductor/constant/conductor.types";

export const CATEGORY_LABEL: Record<PassengerCategory, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  STUDENT: "Student",
  SENIOR: "Senior citizen",
  DISABLED: "Disabled",
  VETERAN: "Veteran",
};

/** Online methods make the ticket PENDING_PAYMENT until a payment confirms. */
export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "NET_BANKING", "WALLET"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const ONLINE_METHODS: PaymentMethod[] = ["UPI", "CARD", "NET_BANKING", "WALLET"];

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Pay cash on board",
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
};

export type TicketStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "USED"
  | "CANCELLED"
  | "EXPIRED";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  PENDING_PAYMENT: "Payment pending",
  CONFIRMED: "Valid",
  USED: "Used",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export interface PassengerTicket {
  _id: string;
  user: string;
  ticketCodeHint: string;
  route: string;
  routeNumber: string | null;
  vehicle: string | null;
  vehicleRegNo: string | null;
  trip: string | null;
  boardingStop: string | null;
  destinationStop: string | null;
  boardingStopName: string | null;
  destinationStopName: string | null;
  passengerCategory: PassengerCategory;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: TicketStatus;
  issuedByRole: string | null;
  passId: string | null;
  passType: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /tickets response also carries the one-time full code. */
export interface CreatedTicket extends PassengerTicket {
  ticketCode: string;
}

export interface BuyTicketInput {
  route: string;
  boardingStop: string;
  destinationStop: string;
  passengerCategory: PassengerCategory;
  paymentMethod: PaymentMethod;
  paid: boolean;
}

/* ---- passes ---- */

export type TicketPassStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface TicketPass {
  _id: string;
  user: string;
  pass: string;
  passName: string;
  type: string;
  price: number;
  currency: string;
  status: TicketPassStatus;
  purchasedAt: string;
  validFrom: string | null;
  expiresAt: string | null;
  durationDays: number | null;
  unlimited: boolean;
  usedCount: number;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---- payments ---- */

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
};

export interface Payment {
  _id: string;
  user: string;
  ticket: string | null;
  trip: string | null;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: PaymentStatus;
  payableFor: "ticket" | "pass";
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
}
