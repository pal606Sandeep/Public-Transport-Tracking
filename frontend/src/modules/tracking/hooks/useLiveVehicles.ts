"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  vehiclesSeeded,
  type LiveVehicle,
} from "@/store/slices/liveVehicles.slice";
import { useRoom } from "@/lib/realtime/useRoom";
import * as svc from "../services/tracking.service";

/**
 * Live vehicles for a route: REST snapshot hydration + `route:` socket room.
 * Returns the merged view from the `liveVehicles` slice, filtered to this route.
 */
export const useLiveRoute = (routeId: string | null) => {
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

  useRoom(routeId ? { routeId } : null, { enabled: Boolean(routeId) });

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
    isLoading: snapshot.isLoading,
    error: snapshot.error,
  };
};

/** Live view of a single trip's vehicle: trip-snapshot + `trip:` socket room. */
export const useLiveTrip = (tripId: string | null, vehicleId?: string | null) => {
  const dispatch = useAppDispatch();

  const snapshot = useQuery({
    queryKey: ["tracking", "trip", tripId],
    queryFn: () => svc.getTripSnapshot(tripId as string),
    enabled: Boolean(tripId),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (snapshot.data) dispatch(vehiclesSeeded([snapshot.data]));
  }, [snapshot.data, dispatch]);

  useRoom(tripId ? { tripId } : null, { enabled: Boolean(tripId) });

  const byId = useAppSelector((s) => s.liveVehicles.byId);
  const vid = vehicleId ?? snapshot.data?.vehicleId ?? null;

  return {
    vehicle: vid ? (byId[vid] ?? null) : null,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
  };
};
