import { api } from "@/utils/apiClient";
import type { ActiveTrip } from "@/modules/driver/constant/driver.types";
import type {
  FareCalcInput,
  FareQuote,
  IssueTicketInput,
  Ticket,
  PaymentQr,
  Reconciliation,
} from "../constant/conductor.types";

/* ---- trip context --------------------------------------------------- */

/** GET /api/v1/me/active-trip (works for conductors too). 404 -> null. */
export const getActiveTrip = async (): Promise<ActiveTrip | null> => {
  try {
    const res = await api.get<{ trip: ActiveTrip }>("/me/active-trip");
    return (res.data as { trip: ActiveTrip }).trip;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
};

/* ---- occupancy (POST /tracking/occupancy) ------------------------- */

export const submitOccupancy = (input: {
  vehicleId: string;
  tripId: string;
  passengerCount: number;
}): Promise<unknown> => api.post("/tracking/occupancy", input);

/* ---- fare (POST /fares/calculate) ------------------------------- */

export const calculateFare = async (
  input: FareCalcInput
): Promise<FareQuote> => {
  const res = await api.post<FareQuote>("/fares/calculate", input);
  return res.data as FareQuote;
};

/* ---- tickets --------------------------------------------------- */

export const issueTicket = async (
  input: IssueTicketInput
): Promise<Ticket> => {
  const res = await api.post<{ ticket: Ticket }>("/tickets", input, {
    idempotent: true,
  });
  return (res.data as { ticket: Ticket }).ticket;
};

export const listTripTickets = async (params: {
  page?: number;
  limit?: number;
}): Promise<{ tickets: Ticket[]; pagination: { total: number } }> => {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 50));
  const res = await api.get<{
    tickets: Ticket[];
    pagination: { total: number };
  }>(`/tickets?${p.toString()}`);
  return {
    tickets: res.data?.tickets ?? [],
    pagination: res.data?.pagination ?? { total: 0 },
  };
};

export const validateTicketCode = async (
  ticketCode: string
): Promise<{ status: string; ticket?: Ticket } & Record<string, unknown>> => {
  const res = await api.post<Record<string, unknown>>("/tickets/validate", {
    ticketCode,
  });
  return (res.data ?? {}) as { status: string; ticket?: Ticket } & Record<
    string,
    unknown
  >;
};

/** Offline backlog flush — POST /tickets/bulk. */
export const issueTicketsBulk = (
  items: (IssueTicketInput & { idempotencyKey: string; issuedAt?: string })[]
): Promise<unknown> =>
  api.post("/tickets/bulk", { items: items.slice(0, 50) });

/* ---- payment QR (POST /payments/qr) --------------------------- */

export const createPaymentQr = async (input: {
  tripId: string;
  amount: number;
  purpose?: string;
}): Promise<PaymentQr> => {
  const res = await api.post<PaymentQr>("/payments/qr", input);
  return res.data as PaymentQr;
};

/* ---- reconciliation (POST /trips/:id/reconciliation) --------- */

export const reconcileTrip = async (
  tripId: string,
  input: {
    ticketsIssued: number;
    cashCollected: number;
    digitalCollected: number;
  }
): Promise<Reconciliation> => {
  const res = await api.post<{ reconciliation: Reconciliation }>(
    `/trips/${tripId}/reconciliation`,
    input
  );
  return (res.data as { reconciliation: Reconciliation }).reconciliation;
};

/** Offline passenger-count backlog — POST /trips/:id/passenger-count/bulk. */
export const passengerCountBulk = (
  tripId: string,
  items: {
    idempotencyKey: string;
    stop?: string;
    boarded?: number;
    alighted?: number;
    recordedAt?: string;
  }[]
): Promise<unknown> =>
  api.post(`/trips/${tripId}/passenger-count/bulk`, {
    items: items.slice(0, 50),
  });
