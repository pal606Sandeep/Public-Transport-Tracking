import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type { Complaint, CreateComplaintInput } from "../constant/complaint.types";

export type CreateComplaintResult =
  | { queued: false; complaint: Complaint }
  | { queued: true };

export const createComplaint = async (
  input: CreateComplaintInput
): Promise<CreateComplaintResult> => {
  const res = await api.post<{ complaint: Complaint }>("/complaints", input, {
    queueOffline: true,
    queueLabel: "Complaint",
  });
  if ((res as { queued?: boolean }).queued) return { queued: true };
  return {
    queued: false,
    complaint: (res.data as { complaint: Complaint }).complaint,
  };
};

export const listMyComplaints = async (params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ complaints: Complaint[]; pagination: Pagination }> => {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 30));
  if (params.status) p.set("status", params.status);
  const res = await api.get<{
    complaints: Complaint[];
    pagination: Pagination;
  }>(`/complaints?${p.toString()}`);
  return {
    complaints: res.data?.complaints ?? [],
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 30 },
  };
};

export const getComplaint = async (id: string): Promise<Complaint> => {
  const res = await api.get<{ complaint: Complaint }>(`/complaints/${id}`);
  return (res.data as { complaint: Complaint }).complaint;
};

export const addComplaintAttachment = async (
  id: string,
  key: string
): Promise<Complaint> => {
  const res = await api.post<{ complaint: Complaint }>(
    `/complaints/${id}/attachments`,
    { key }
  );
  return (res.data as { complaint: Complaint }).complaint;
};

export const submitComplaintFeedback = async (
  id: string,
  input: { rating: number; comment?: string }
): Promise<Complaint> => {
  const res = await api.post<{ complaint: Complaint }>(
    `/complaints/${id}/feedback`,
    input
  );
  return (res.data as { complaint: Complaint }).complaint;
};
