import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type { Payment, PaymentListParams } from "./payment.types";

const BASE = "/admin/payments";

export async function listPayments(
  params: PaymentListParams = {}
): Promise<{ payments: Payment[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  if (params.method) p.set("method", params.method);
  if (params.payableFor) p.set("payableFor", params.payableFor);
  if (params.from) p.set("from", params.from);
  if (params.to) p.set("to", params.to);
  const res = await api.get<{ payments: Payment[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    payments: res.data?.payments ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getPayment(id: string): Promise<Payment> {
  const res = await api.get<{ payment: Payment }>(`${BASE}/${id}`);
  return (res.data as { payment: Payment }).payment;
}

export async function refundPayment(
  id: string,
  reason?: string
): Promise<Payment> {
  const res = await api.post<{ payment: Payment; refunded: boolean }>(
    `${BASE}/${id}/refund`,
    reason ? { reason } : {}
  );
  return (res.data as { payment: Payment }).payment;
}
