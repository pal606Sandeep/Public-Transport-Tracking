"use client";

import { useQuery } from "@tanstack/react-query";
import { listRoutes, getRoute } from "../services/route.service";
import type { RouteListParams } from "../constant/route.types";

export const routeKeys = {
  all: ["routes"] as const,
  list: (params: RouteListParams) => ["routes", "list", params] as const,
  detail: (id: string) => ["routes", "detail", id] as const,
};

export const useRoutes = (params: RouteListParams = {}) =>
  useQuery({
    queryKey: routeKeys.list(params),
    queryFn: () => listRoutes(params),
  });

export const useRoute = (id: string) =>
  useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => getRoute(id),
    enabled: Boolean(id),
  });
