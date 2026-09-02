export const PASSENGER_CATEGORIES = [
  "ADULT",
  "CHILD",
  "STUDENT",
  "SENIOR",
  "DISABLED",
  "VETERAN",
] as const;
export type PassengerCategory = (typeof PASSENGER_CATEGORIES)[number];

/* ---- fare calc (POST /fares/calculate) ------------------------------- */

export interface FareQuote {
  routeId: string;
  routeNumber: string | null;
  boardingStopId: string;
  destinationStopId: string;
  stopsSpanned: number;
  distanceKm: number | null;
  passengerCategory: PassengerCategory;
  amount: number;
  currency: string;
  breakdown: Record<string, unknown>;
  appliedConcession: {
    id: string;
    code: string;
    name: string;
    type: string;
    discountPercent: number;
  } | null;
}

export interface FareCalcInput {
  routeId?: string;
  boardingStopId: string;
  destinationStopId: string;
  passengerCategory?: PassengerCategory;
  concessionId?: string;
  distanceKm?: number;
}

/* ---- ticket (POST /tickets) --------------------------------------- */

export interface Ticket {
  _id: string;
  ticketCodeHint: string;
  route: string;
  routeNumber?: string | null;
  vehicle: string | null;
  trip: string | null;
  boardingStop: string | null;
  destinationStop: string | null;
  boardingStopName?: string | null;
  destinationStopName?: string | null;
  passengerCategory: PassengerCategory;
  amount: number;
  currency: string;
  paymentMethod: string;
  status:
    | "PENDING_PAYMENT"
    | "CONFIRMED"
    | "USED"
    | "CANCELLED"
    | "EXPIRED";
  createdAt?: string;
}

export interface IssueTicketInput {
  route: string;
  trip?: string | null;
  vehicle?: string | null;
  boardingStop: string;
  destinationStop: string;
  passengerCategory: PassengerCategory;
  concessionId?: string;
  paymentMethod: string; // CASH | QR | CARD | UPI
  paid: boolean;
  distanceKm?: number;
}

/* ---- payment QR (POST /payments/qr) ------------------------------- */

export interface PaymentQr {
  payment: { _id: string; amount: number; status: string };
  paymentReference: string;
  upiString: string;
  qrPayload: string; // base64 of the upi string
}

/* ---- reconciliation (POST /trips/:id/reconciliation) ------------- */

export interface Reconciliation {
  expected: number;
  collected: number;
  variance: number;
  ticketsIssued: number;
  cashCollected: number;
  digitalCollected: number;
}
