"use client";

import { useQuery } from "@tanstack/react-query";
import { listStops, getStop } from "../services/stop.service";
import type { StopListParams } from "../constant/stop.types";

export const stopKeys = {
  all: ["stops"] as const,
  list: (params: StopListParams) => ["stops", "list", params] as const,
  detail: (id: string) => ["stops", "detail", id] as const,
};

export const useStops = (params: StopListParams = {}) =>
  useQuery({
    queryKey: stopKeys.list(params),
    queryFn: () => listStops(params),
  });

export const useStop = (id: string) =>
  useQuery({
    queryKey: stopKeys.detail(id),
    queryFn: () => getStop(id),
    enabled: Boolean(id),
  });
