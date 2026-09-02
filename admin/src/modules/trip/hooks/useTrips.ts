"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/trip.service";
import type {
  TripListParams,
  CreateTripInput,
  AssignTripInput,
  TripStatus,
} from "../constant/trip.types";

export const tripKeys = {
  all: ["trips"] as const,
  list: (p: TripListParams) => ["trips", "list", p] as const,
  detail: (id: string) => ["trips", "detail", id] as const,
};

export const useTrips = (params: TripListParams) =>
  useQuery({
    queryKey: tripKeys.list(params),
    queryFn: () => svc.listTrips(params),
  });

export const useTrip = (id: string) =>
  useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => svc.getTrip(id),
    enabled: Boolean(id),
  });

export const useCreateTrip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => svc.createTrip(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: tripKeys.all }),
  });
};

/** All trip mutations that return the updated trip. */
export const useTripActions = (id: string) => {
  const qc = useQueryClient();
  const settle = (trip: unknown) => {
    qc.setQueryData(tripKeys.detail(id), trip);
    qc.invalidateQueries({ queryKey: tripKeys.all });
  };

  const assign = useMutation({
    mutationFn: (input: AssignTripInput) => svc.assignTrip(id, input),
    onSuccess: settle,
  });
  const transition = useMutation({
    mutationFn: (status: TripStatus) => svc.transitionTrip(id, status),
    onSuccess: settle,
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => svc.cancelTrip(id, reason),
    onSuccess: settle,
  });
  const miss = useMutation({
    mutationFn: () => svc.missTrip(id),
    onSuccess: settle,
  });
  const complete = useMutation({
    mutationFn: () => svc.completeTrip(id),
    onSuccess: settle,
  });
  const forceEnd = useMutation({
    mutationFn: () => svc.forceEndTrip(id),
    onSuccess: settle,
  });

  return { assign, transition, cancel, miss, complete, forceEnd };
};
