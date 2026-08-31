import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type { Stop, StopListParams } from "../constant/stop.types";

const qs = (params: StopListParams): string => {
  const p = new URLSearchParams();
  if (params.page) p.set("page", String(params.page));
  if (params.limit) p.set("limit", String(params.limit));
  if (params.search) p.set("search", params.search);
  if (params.isActive !== undefined) p.set("isActive", String(params.isActive));
  if (params.near) {
    p.set("lat", String(params.near.lat));
    p.set("lng", String(params.near.lng));
    if (params.near.maxDistance) p.set("maxDistance", String(params.near.maxDistance));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const listStops = async (
  params: StopListParams = {}
): Promise<{ stops: Stop[]; pagination: Pagination }> => {
  const res = await api.get<{ stops: Stop[]; pagination: Pagination }>(
    `/stops${qs(params)}`
  );
  return {
    stops: res.data?.stops ?? [],
    pagination:
      res.data?.pagination ?? { total: 0, page: 1, limit: params.limit ?? 20 },
  };
};

export const getStop = async (id: string): Promise<Stop> => {
  const res = await api.get<{ stop: Stop }>(`/stops/${id}`);
  return (res.data as { stop: Stop }).stop;
};
