"use client";

import { useQuery } from "@tanstack/react-query";
import { listServiceAlerts } from "../services/serviceAlert.service";

export const useServiceAlerts = (params: { routeId?: string; stopId?: string } = {}) =>
  useQuery({
    queryKey: ["service-alerts", params.routeId ?? null, params.stopId ?? null],
    queryFn: () => listServiceAlerts(params),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
