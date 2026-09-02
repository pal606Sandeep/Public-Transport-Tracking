"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  vehiclesSeeded,
  vehiclesCleared,
  type LiveVehicle,
} from "@/store/slices/liveVehicles.slice";
import { useRoom } from "@/lib/realtime/useRoom";
import * as svc from "./tracking.service";

/**
 * Live vehicles for a route: REST snapshot hydration (30s) + `route:` socket
 * room. When `routeId` is null and `fleetAll` is true, subscribes to the
 * fleet room (live only — no REST seed available).
 */
export const useLiveFleet = (
  routeId: string | null,
  fleetAll: boolean
) => {
  const dispatch = useAppDispatch();

  const snapshot = useQuery({
    queryKey: ["tracking", "route", routeId],
    queryFn: () => svc.getRouteLiveVehicles(routeId as string),
    enabled: Boolean(routeId),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (snapshot.data) dispatch(vehiclesSeeded(snapshot.data));
  }, [snapshot.data, dispatch]);

  // clear the store when switching mode so stale markers don't linger
  useEffect(() => {
    dispatch(vehiclesCleared());
  }, [routeId, fleetAll, dispatch]);

  useRoom(
    routeId ? { routeId } : fleetAll ? { fleetAll: true } : null,
    { enabled: Boolean(routeId) || fleetAll }
  );

  const byId = useAppSelector((s) => s.liveVehicles.byId);
  const vehicles = useMemo(
    () =>
      Object.values(byId).filter(
        (v) => !routeId || !v.routeId || v.routeId === routeId
      ),
    [byId, routeId]
  );

  return {
    vehicles: vehicles as LiveVehicle[],
    isLoading: Boolean(routeId) && snapshot.isLoading,
    error: snapshot.error,
  };
};
