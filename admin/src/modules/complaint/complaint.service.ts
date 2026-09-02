import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Complaint,
  ComplaintHistoryEntry,
  ComplaintListParams,
} from "./complaint.types";

const BASE = "/admin/complaints";

export async function listComplaints(
  params: ComplaintListParams = {}
): Promise<{ complaints: Complaint[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  if (params.category) p.set("category", params.category);
  if (params.priority) p.set("priority", params.priority);
  const res = await api.get<{ complaints: Complaint[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    complaints: res.data?.complaints ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getComplaint(id: string): Promise<Complaint> {
  const res = await api.get<{ complaint: Complaint }>(`${BASE}/${id}`);
  return (res.data as { complaint: Complaint }).complaint;
}

export async function getComplaintHistory(
  id: string
): Promise<ComplaintHistoryEntry[]> {
  const res = await api.get<{ history: ComplaintHistoryEntry[] }>(
    `${BASE}/${id}/history`
  );
  return res.data?.history ?? [];
}

export async function assignComplaint(
  id: string,
  assigneeId: string,
  note?: string
): Promise<Complaint> {
  const res = await api.post<{ complaint: Complaint }>(`${BASE}/${id}/assign`, {
    assigneeId,
    ...(note ? { note } : {}),
  });
  return (res.data as { complaint: Complaint }).complaint;
}

export async function updateComplaint(
  id: string,
  input: { priority?: string; status?: string; note?: string }
): Promise<Complaint> {
  const res = await api.patch<{ complaint: Complaint }>(`${BASE}/${id}`, input);
  return (res.data as { complaint: Complaint }).complaint;
}

export async function escalateComplaint(
  id: string,
  reason: string,
  assigneeId?: string
): Promise<Complaint> {
  const res = await api.post<{ complaint: Complaint }>(
    `${BASE}/${id}/escalate`,
    { reason, ...(assigneeId ? { assigneeId } : {}) }
  );
  return (res.data as { complaint: Complaint }).complaint;
}

export async function resolveComplaint(
  id: string,
  note: string
): Promise<Complaint> {
  const res = await api.post<{ complaint: Complaint }>(`${BASE}/${id}/resolve`, {
    note,
  });
  return (res.data as { complaint: Complaint }).complaint;
}

export async function closeComplaint(
  id: string,
  note?: string
): Promise<Complaint> {
  const res = await api.post<{ complaint: Complaint }>(`${BASE}/${id}/close`, {
    ...(note ? { note } : {}),
  });
  return (res.data as { complaint: Complaint }).complaint;
}
