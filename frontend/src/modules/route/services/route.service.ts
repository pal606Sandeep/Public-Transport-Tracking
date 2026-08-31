import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type { Route, RouteListParams } from "../constant/route.types";

const qs = (params: RouteListParams): string => {
  const p = new URLSearchParams();
  if (params.page) p.set("page", String(params.page));
  if (params.limit) p.set("limit", String(params.limit));
  if (params.search) p.set("search", params.search);
  if (params.status) p.set("status", params.status);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const listRoutes = async (
  params: RouteListParams = {}
): Promise<{ routes: Route[]; pagination: Pagination }> => {
  const res = await api.get<{ routes: Route[]; pagination: Pagination }>(
    `/routes${qs(params)}`
  );
  return {
    routes: res.data?.routes ?? [],
    pagination:
      res.data?.pagination ?? { total: 0, page: 1, limit: params.limit ?? 20 },
  };
};

export const getRoute = async (id: string): Promise<Route> => {
  const res = await api.get<{ route: Route }>(`/routes/${id}`);
  return (res.data as { route: Route }).route;
};
