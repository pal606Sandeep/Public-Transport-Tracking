import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";

export type AssignmentRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AssignmentRequest {
  _id: string;
  staffType: string;
  requestedDate: string;
  status: AssignmentRequestStatus;
  reason: string | null;
  note: string | null;
  createdAt: string;
}

const BASE = "/admin/assignment-requests";

export async function listAssignmentRequests(params: {
  page?: number;
  limit?: number;
  status?: AssignmentRequestStatus;
}): Promise<{ requests: AssignmentRequest[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  const res = await api.get<{
    requests: AssignmentRequest[];
    pagination: Pagination;
  }>(`${BASE}?${p.toString()}`);
  return {
    requests: res.data?.requests ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function decideAssignmentRequest(
  id: string,
  decision: "APPROVE" | "REJECT",
  note?: string
): Promise<{ _id: string; status: AssignmentRequestStatus; note: string | null }> {
  const res = await api.patch<{
    _id: string;
    status: AssignmentRequestStatus;
    note: string | null;
  }>(`${BASE}/${id}/decision`, { decision, ...(note ? { note } : {}) });
  return res.data as {
    _id: string;
    status: AssignmentRequestStatus;
    note: string | null;
  };
}
