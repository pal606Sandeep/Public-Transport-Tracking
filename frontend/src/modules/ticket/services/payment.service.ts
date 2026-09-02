import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type { Payment } from "../constant/ticket.types";

export interface CreatePaymentInput {
  ticket?: string;
  amount: number;
  currency?: string;
  method: "UPI" | "CARD" | "NET_BANKING" | "WALLET";
  provider: string;
  payableFor?: "ticket" | "pass";
}

export const createPayment = async (
  input: CreatePaymentInput
): Promise<{ payment: Payment; paymentReference: string }> => {
  const res = await api.post<{ payment: Payment; paymentReference: string }>(
    "/payments",
    input,
    { idempotent: true }
  );
  return res.data as { payment: Payment; paymentReference: string };
};

export const listMyPayments = async (params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ payments: Payment[]; pagination: Pagination }> => {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  const res = await api.get<{ payments: Payment[]; pagination: Pagination }>(
    `/payments?${p.toString()}`
  );
  return {
    payments: res.data?.payments ?? [],
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 20 },
  };
};

export const getPayment = async (id: string): Promise<Payment> => {
  const res = await api.get<{ payment: Payment }>(`/payments/${id}`);
  return (res.data as { payment: Payment }).payment;
};
