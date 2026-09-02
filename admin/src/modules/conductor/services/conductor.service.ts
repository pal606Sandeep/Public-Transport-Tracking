import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Conductor,
  ConductorInput,
  ConductorListParams,
  ConductorStatus,
} from "../constant/conductor.types";

const BASE = "/admin/conductors";

export async function listConductors(
  params: ConductorListParams = {}
): Promise<{ conductors: Conductor[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (params.status) p.set("status", params.status);
  const res = await api.get<{
    conductors: Conductor[];
    pagination: Pagination;
  }>(`${BASE}?${p.toString()}`);
  return {
    conductors: res.data?.conductors ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getConductor(id: string): Promise<Conductor> {
  const res = await api.get<{ conductor: Conductor }>(`${BASE}/${id}`);
  return (res.data as { conductor: Conductor }).conductor;
}

export async function createConductor(
  input: ConductorInput
): Promise<Conductor> {
  const res = await api.post<{ conductor: Conductor }>(BASE, input);
  return (res.data as { conductor: Conductor }).conductor;
}

export async function updateConductor(
  id: string,
  input: Partial<ConductorInput>
): Promise<Conductor> {
  const res = await api.patch<{ conductor: Conductor }>(`${BASE}/${id}`, input);
  return (res.data as { conductor: Conductor }).conductor;
}

export async function setConductorStatus(
  id: string,
  status: ConductorStatus
): Promise<void> {
  await api.post(`${BASE}/${id}/status`, { status });
}

export async function assignConductor(
  id: string,
  body: {
    vehicleId: string | null;
    routeId: string | null;
    scheduleId: string | null;
  }
): Promise<Conductor> {
  const res = await api.post<{ conductor: Conductor }>(
    `${BASE}/${id}/assign`,
    body
  );
  return (res.data as { conductor: Conductor }).conductor;
}

export async function deleteConductor(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
