import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  BuyTicketInput,
  CreatedTicket,
  PassengerTicket,
  TicketPass,
} from "../constant/ticket.types";

export const buyTicket = async (
  input: BuyTicketInput
): Promise<CreatedTicket> => {
  const res = await api.post<{ ticket: CreatedTicket }>("/tickets", input, {
    idempotent: true,
  });
  return (res.data as { ticket: CreatedTicket }).ticket;
};

export const listMyTickets = async (params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ tickets: PassengerTicket[]; pagination: Pagination }> => {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  const res = await api.get<{
    tickets: PassengerTicket[];
    pagination: Pagination;
  }>(`/tickets?${p.toString()}`);
  return {
    tickets: res.data?.tickets ?? [],
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 20 },
  };
};

export const getTicket = async (id: string): Promise<PassengerTicket> => {
  const res = await api.get<{ ticket: PassengerTicket }>(`/tickets/${id}`);
  return (res.data as { ticket: PassengerTicket }).ticket;
};

export const cancelTicket = async (
  id: string,
  reason?: string
): Promise<PassengerTicket> => {
  const res = await api.post<{ ticket: PassengerTicket }>(
    `/tickets/${id}/cancel`,
    { reason: reason ?? null }
  );
  return (res.data as { ticket: PassengerTicket }).ticket;
};

/* ---- passes ---- */

export const listMyPasses = async (): Promise<TicketPass[]> => {
  const res = await api.get<{ passes: TicketPass[] }>("/tickets/passes");
  return res.data?.passes ?? [];
};

export const getActivePass = async (): Promise<TicketPass | null> => {
  const res = await api.get<{ pass: TicketPass | null }>(
    "/tickets/passes/active"
  );
  return res.data?.pass ?? null;
};

export const purchasePass = async (passId: string): Promise<TicketPass> => {
  const res = await api.post<{ pass: TicketPass }>(
    "/tickets/passes/purchase",
    { pass: passId },
    { idempotent: true }
  );
  return (res.data as { pass: TicketPass }).pass;
};
