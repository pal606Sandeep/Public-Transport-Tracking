import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type { Stop, StopInput, StopListParams } from "../constant/stop.types";

const BASE = "/admin/stops";

export async function listStops(
  params: StopListParams = {}
): Promise<{ stops: Stop[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (typeof params.isActive === "boolean")
    p.set("isActive", String(params.isActive));
  const res = await api.get<{ stops: Stop[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    stops: res.data?.stops ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getStop(id: string): Promise<Stop> {
  const res = await api.get<{ stop: Stop }>(`${BASE}/${id}`);
  return (res.data as { stop: Stop }).stop;
}

export async function createStop(input: StopInput): Promise<Stop> {
  const res = await api.post<{ stop: Stop }>(BASE, input);
  return (res.data as { stop: Stop }).stop;
}

export async function updateStop(
  id: string,
  input: Partial<StopInput>
): Promise<Stop> {
  const res = await api.patch<{ stop: Stop }>(`${BASE}/${id}`, input);
  return (res.data as { stop: Stop }).stop;
}

export async function deactivateStop(id: string): Promise<Stop> {
  const res = await api.post<{ stop: Stop }>(`${BASE}/${id}/deactivate`);
  return (res.data as { stop: Stop }).stop;
}

export async function deleteStop(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
