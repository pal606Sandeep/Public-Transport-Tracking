import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Incident,
  IncidentListParams,
  CreateIncidentInput,
} from "../constant/incident.types";

const BASE = "/admin/incidents";

export async function listIncidents(
  params: IncidentListParams = {}
): Promise<{ incidents: Incident[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  if (params.type) p.set("type", params.type);
  if (params.source) p.set("source", params.source);
  if (params.search) p.set("search", params.search);
  const res = await api.get<{ incidents: Incident[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    incidents: res.data?.incidents ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getIncident(id: string): Promise<Incident> {
  const res = await api.get<{ incident: Incident }>(`${BASE}/${id}`);
  return (res.data as { incident: Incident }).incident;
}

export async function createIncident(
  input: CreateIncidentInput
): Promise<Incident> {
  const res = await api.post<{ incident: Incident }>(BASE, input);
  return (res.data as { incident: Incident }).incident;
}

export async function updateIncident(
  id: string,
  input: Partial<Omit<CreateIncidentInput, "type">>
): Promise<Incident> {
  const res = await api.patch<{ incident: Incident }>(`${BASE}/${id}`, input);
  return (res.data as { incident: Incident }).incident;
}

export async function acknowledgeIncident(id: string): Promise<Incident> {
  const res = await api.post<{ incident: Incident }>(`${BASE}/${id}/acknowledge`);
  return (res.data as { incident: Incident }).incident;
}

export async function assignIncident(
  id: string,
  assignedTo: string
): Promise<Incident> {
  const res = await api.post<{ incident: Incident }>(`${BASE}/${id}/assign`, {
    assignedTo,
  });
  return (res.data as { incident: Incident }).incident;
}

export async function resolveIncident(
  id: string,
  note?: string
): Promise<Incident> {
  const res = await api.post<{ incident: Incident }>(`${BASE}/${id}/resolve`, {
    ...(note ? { note } : {}),
  });
  return (res.data as { incident: Incident }).incident;
}

export async function closeIncident(id: string): Promise<Incident> {
  const res = await api.post<{ incident: Incident }>(`${BASE}/${id}/close`);
  return (res.data as { incident: Incident }).incident;
}

export async function deleteIncident(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
