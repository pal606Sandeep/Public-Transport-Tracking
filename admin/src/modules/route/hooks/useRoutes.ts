"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/route.service";
import type {
  RouteInput,
  RouteListParams,
  RouteStatus,
} from "../constant/route.types";

export const routeKeys = {
  all: ["routes"] as const,
  list: (p: RouteListParams) => ["routes", "list", p] as const,
  detail: (id: string) => ["routes", "detail", id] as const,
};

export const useRoutes = (params: RouteListParams) =>
  useQuery({
    queryKey: routeKeys.list(params),
    queryFn: () => svc.listRoutes(params),
  });

export const useRoute = (id: string) =>
  useQuery({
    queryKey: routeKeys.detail(id),
    queryFn: () => svc.getRoute(id),
    enabled: Boolean(id),
  });

export const useCreateRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RouteInput) => svc.createRoute(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: routeKeys.all }),
  });
};

export const useUpdateRoute = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<RouteInput>) => svc.updateRoute(id, input),
    onSuccess: (route) => {
      qc.setQueryData(routeKeys.detail(id), route);
      qc.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
};

export const useSetRouteStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RouteStatus }) =>
      svc.setRouteStatus(id, status),
    onSuccess: (route) => {
      qc.setQueryData(routeKeys.detail(route._id), route);
      qc.invalidateQueries({ queryKey: routeKeys.all });
    },
  });
};

export const useDeleteRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: routeKeys.all }),
  });
};

/** Mutations that operate on a route's ordered stop list. */
export const useRouteStops = (id: string) => {
  const qc = useQueryClient();
  const settle = (route: unknown) => {
    qc.setQueryData(routeKeys.detail(id), route);
    qc.invalidateQueries({ queryKey: routeKeys.all });
  };

  const add = useMutation({
    mutationFn: (entry: {
      stopId: string;
      sequence: number;
      scheduledOffsetMinutes: number;
    }) => svc.addRouteStop(id, entry),
    onSuccess: settle,
  });

  const remove = useMutation({
    mutationFn: (stopId: string) => svc.removeRouteStop(id, stopId),
    onSuccess: settle,
  });

  const reorder = useMutation({
    mutationFn: (stopIds: string[]) => svc.reorderRouteStops(id, stopIds),
    onSuccess: settle,
  });

  return { add, remove, reorder };
};
