"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import * as svc from "../services/journey.service";

export const useStopSearch = (q: string) =>
  useQuery({
    queryKey: ["journey", "stop-search", q],
    queryFn: () => svc.searchStops({ q }),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });

export const useNearbyStops = (
  coords: { lat: number; lng: number } | null
) =>
  useQuery({
    queryKey: ["journey", "nearby", coords?.lat, coords?.lng],
    queryFn: () => svc.searchStops({ ...coords!, radius: 1500 }),
    enabled: Boolean(coords),
  });

export const usePlanJourney = () =>
  useMutation({
    mutationFn: (input: {
      from: string;
      to: string;
      time?: number;
      maxTransfers?: 0 | 1;
    }) => svc.planJourney(input),
  });
