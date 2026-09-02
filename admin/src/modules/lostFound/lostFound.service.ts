import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  LostFoundItem,
  LostFoundListParams,
  MatchResult,
} from "./lostFound.types";

const BASE = "/admin/lost-found";

export async function listLostFound(
  params: LostFoundListParams = {}
): Promise<{ items: LostFoundItem[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.kind) p.set("kind", params.kind);
  if (params.status) p.set("status", params.status);
  const res = await api.get<{ items: LostFoundItem[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    items: res.data?.items ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getLostFound(id: string): Promise<LostFoundItem> {
  const res = await api.get<{ item: LostFoundItem }>(`${BASE}/${id}`);
  return (res.data as { item: LostFoundItem }).item;
}

export async function getMatches(
  id: string,
  windowDays = 3
): Promise<MatchResult> {
  const res = await api.get<MatchResult>(
    `${BASE}/${id}/matches?windowDays=${windowDays}`
  );
  return res.data as MatchResult;
}

export async function assignLostFound(
  id: string,
  assigneeId: string,
  note?: string
): Promise<LostFoundItem> {
  const res = await api.post<{ item: LostFoundItem }>(`${BASE}/${id}/assign`, {
    assigneeId,
    ...(note ? { note } : {}),
  });
  return (res.data as { item: LostFoundItem }).item;
}

export async function updateLostFound(
  id: string,
  input: { status?: string; note?: string }
): Promise<LostFoundItem> {
  const res = await api.patch<{ item: LostFoundItem }>(`${BASE}/${id}`, input);
  return (res.data as { item: LostFoundItem }).item;
}

export async function confirmReturn(
  id: string,
  input: { matchId: string; returnedTo: string; note?: string }
): Promise<{ item: LostFoundItem; match: LostFoundItem }> {
  const res = await api.post<{ item: LostFoundItem; match: LostFoundItem }>(
    `${BASE}/${id}/confirm-return`,
    input
  );
  return res.data as { item: LostFoundItem; match: LostFoundItem };
}

export async function closeLostFound(
  id: string,
  note?: string
): Promise<LostFoundItem> {
  const res = await api.post<{ item: LostFoundItem }>(`${BASE}/${id}/close`, {
    ...(note ? { note } : {}),
  });
  return (res.data as { item: LostFoundItem }).item;
}
