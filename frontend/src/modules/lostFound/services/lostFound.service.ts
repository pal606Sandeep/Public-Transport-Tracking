import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  CreateLostFoundInput,
  LostFoundItem,
} from "../constant/lostFound.types";

export const createLostFound = async (
  input: CreateLostFoundInput
): Promise<LostFoundItem> => {
  const res = await api.post<{ item: LostFoundItem }>("/lost-found", input);
  return (res.data as { item: LostFoundItem }).item;
};

export const listMyLostFound = async (params: {
  page?: number;
  limit?: number;
  kind?: string;
  status?: string;
}): Promise<{ items: LostFoundItem[]; pagination: Pagination }> => {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.kind) p.set("kind", params.kind);
  if (params.status) p.set("status", params.status);
  const res = await api.get<{ items: LostFoundItem[]; pagination: Pagination }>(
    `/lost-found?${p.toString()}`
  );
  return {
    items: res.data?.items ?? [],
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 20 },
  };
};

export const getLostFoundItem = async (
  id: string
): Promise<LostFoundItem> => {
  const res = await api.get<{ item: LostFoundItem }>(`/lost-found/${id}`);
  return (res.data as { item: LostFoundItem }).item;
};
