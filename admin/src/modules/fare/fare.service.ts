import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Fare,
  FareInput,
  FareRule,
  FareRuleInput,
  Concession,
  ConcessionInput,
  Pass,
  PassInput,
} from "./fare.types";

const BASE = "/admin/fares";

/* ---- fare rules (no pagination) ---- */
export async function listFareRules(): Promise<FareRule[]> {
  const res = await api.get<{ fareRules: FareRule[] }>(`${BASE}/rules`);
  return res.data?.fareRules ?? [];
}
export async function createFareRule(input: FareRuleInput): Promise<FareRule> {
  const res = await api.post<{ fareRule: FareRule }>(`${BASE}/rules`, input);
  return (res.data as { fareRule: FareRule }).fareRule;
}
export async function updateFareRule(
  id: string,
  input: Partial<FareRuleInput>
): Promise<FareRule> {
  const res = await api.patch<{ fareRule: FareRule }>(
    `${BASE}/rules/${id}`,
    input
  );
  return (res.data as { fareRule: FareRule }).fareRule;
}
export async function deleteFareRule(id: string): Promise<void> {
  await api.del(`${BASE}/rules/${id}`);
}

/* ---- fares ---- */
export async function listFares(
  params: { page?: number; limit?: number } = {}
): Promise<{ fares: Fare[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 50));
  const res = await api.get<{ fares: Fare[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    fares: res.data?.fares ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 },
  };
}
export async function createFare(input: FareInput): Promise<Fare> {
  const res = await api.post<{ fare: Fare }>(BASE, input);
  return (res.data as { fare: Fare }).fare;
}
export async function updateFare(
  id: string,
  input: Partial<FareInput>
): Promise<Fare> {
  const res = await api.patch<{ fare: Fare }>(`${BASE}/${id}`, input);
  return (res.data as { fare: Fare }).fare;
}
export async function deleteFare(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}

/* ---- concessions ---- */
export async function listConcessions(
  params: { page?: number; limit?: number } = {}
): Promise<{ concessions: Concession[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 50));
  const res = await api.get<{
    concessions: Concession[];
    pagination: Pagination;
  }>(`${BASE}/concessions?${p.toString()}`);
  return {
    concessions: res.data?.concessions ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 },
  };
}
export async function createConcession(
  input: ConcessionInput
): Promise<Concession> {
  const res = await api.post<{ concession: Concession }>(
    `${BASE}/concessions`,
    input
  );
  return (res.data as { concession: Concession }).concession;
}
export async function updateConcession(
  id: string,
  input: Partial<ConcessionInput>
): Promise<Concession> {
  const res = await api.patch<{ concession: Concession }>(
    `${BASE}/concessions/${id}`,
    input
  );
  return (res.data as { concession: Concession }).concession;
}
export async function deleteConcession(id: string): Promise<void> {
  await api.del(`${BASE}/concessions/${id}`);
}

/* ---- passes ---- */
export async function listPasses(
  params: { page?: number; limit?: number } = {}
): Promise<{ passes: Pass[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 50));
  const res = await api.get<{ passes: Pass[]; pagination: Pagination }>(
    `${BASE}/passes?${p.toString()}`
  );
  return {
    passes: res.data?.passes ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 },
  };
}
export async function createPass(input: PassInput): Promise<Pass> {
  const res = await api.post<{ pass: Pass }>(`${BASE}/passes`, input);
  return (res.data as { pass: Pass }).pass;
}
export async function updatePass(
  id: string,
  input: Partial<PassInput>
): Promise<Pass> {
  const res = await api.patch<{ pass: Pass }>(`${BASE}/passes/${id}`, input);
  return (res.data as { pass: Pass }).pass;
}
export async function deletePass(id: string): Promise<void> {
  await api.del(`${BASE}/passes/${id}`);
}
