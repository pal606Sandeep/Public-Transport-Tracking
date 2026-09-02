import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  ServiceAlert,
  ServiceAlertInput,
  ServiceAlertListParams,
} from "./serviceAlert.types";

const BASE = "/admin/service-alerts";

export async function listServiceAlerts(
  params: ServiceAlertListParams = {}
): Promise<{ serviceAlerts: ServiceAlert[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  if (params.type) p.set("type", params.type);
  if (params.search) p.set("search", params.search);
  const res = await api.get<{
    serviceAlerts: ServiceAlert[];
    pagination: Pagination;
  }>(`${BASE}?${p.toString()}`);
  return {
    serviceAlerts: res.data?.serviceAlerts ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getServiceAlert(id: string): Promise<ServiceAlert> {
  const res = await api.get<{ serviceAlert: ServiceAlert }>(`${BASE}/${id}`);
  return (res.data as { serviceAlert: ServiceAlert }).serviceAlert;
}

export async function createServiceAlert(
  input: ServiceAlertInput
): Promise<ServiceAlert> {
  const res = await api.post<{ serviceAlert: ServiceAlert }>(BASE, input);
  return (res.data as { serviceAlert: ServiceAlert }).serviceAlert;
}

export async function updateServiceAlert(
  id: string,
  input: Partial<Omit<ServiceAlertInput, "status">>
): Promise<ServiceAlert> {
  const res = await api.patch<{ serviceAlert: ServiceAlert }>(
    `${BASE}/${id}`,
    input
  );
  return (res.data as { serviceAlert: ServiceAlert }).serviceAlert;
}

export async function publishServiceAlert(id: string): Promise<ServiceAlert> {
  const res = await api.post<{ serviceAlert: ServiceAlert }>(
    `${BASE}/${id}/publish`
  );
  return (res.data as { serviceAlert: ServiceAlert }).serviceAlert;
}

export async function cancelServiceAlert(id: string): Promise<ServiceAlert> {
  const res = await api.post<{ serviceAlert: ServiceAlert }>(
    `${BASE}/${id}/cancel`
  );
  return (res.data as { serviceAlert: ServiceAlert }).serviceAlert;
}

export async function deleteServiceAlert(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
