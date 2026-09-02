import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Route,
  RouteInput,
  RouteListParams,
  RouteStatus,
} from "../constant/route.types";

const BASE = "/admin/routes";

export async function listRoutes(
  params: RouteListParams = {}
): Promise<{ routes: Route[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (params.status) p.set("status", params.status);
  const res = await api.get<{ routes: Route[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    routes: res.data?.routes ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getRoute(id: string): Promise<Route> {
  const res = await api.get<{ route: Route }>(`${BASE}/${id}`);
  return (res.data as { route: Route }).route;
}

export async function createRoute(input: RouteInput): Promise<Route> {
  const res = await api.post<{ route: Route }>(BASE, input);
  return (res.data as { route: Route }).route;
}

export async function updateRoute(
  id: string,
  input: Partial<RouteInput>
): Promise<Route> {
  const res = await api.patch<{ route: Route }>(`${BASE}/${id}`, input);
  return (res.data as { route: Route }).route;
}

export async function setRouteStatus(
  id: string,
  status: RouteStatus
): Promise<Route> {
  const path = status === "ACTIVE" ? "activate" : "deactivate";
  const res = await api.post<{ route: Route }>(`${BASE}/${id}/${path}`);
  return (res.data as { route: Route }).route;
}

export async function deleteRoute(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}

export async function addRouteStop(
  id: string,
  entry: { stopId: string; sequence: number; scheduledOffsetMinutes: number }
): Promise<Route> {
  const res = await api.post<{ route: Route }>(`${BASE}/${id}/stops`, entry);
  return (res.data as { route: Route }).route;
}

export async function removeRouteStop(
  id: string,
  stopId: string
): Promise<Route> {
  const res = await api.del<{ route: Route }>(`${BASE}/${id}/stops/${stopId}`);
  return (res.data as { route: Route }).route;
}

export async function reorderRouteStops(
  id: string,
  stopIds: string[]
): Promise<Route> {
  const res = await api.put<{ route: Route }>(`${BASE}/${id}/stops/order`, {
    stopIds,
  });
  return (res.data as { route: Route }).route;
}
