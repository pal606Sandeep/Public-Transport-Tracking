"use client";

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { tripPhaseSet, tripCleared } from "@/store/slices/activeTrip.slice";
import * as trip from "../services/trip.service";
import type { ChecklistInput } from "../constant/driver.types";

export const activeTripKey = ["driver", "active-trip"] as const;

/** Restore any in-progress trip (server side of truth). */
export const useActiveTrip = () => {
  const dispatch = useAppDispatch();
  return useQuery({
    queryKey: activeTripKey,
    queryFn: async () => {
      const t = await trip.getActiveTrip();
      dispatch(
        t
          ? tripPhaseSet({
              tripId: t._id,
              phase: t.status === "PAUSED" ? "paused" : "active",
            })
          : tripCleared()
      );
      return t;
    },
    staleTime: 15_000,
  });
};

export const useTripPhase = () => useAppSelector((s) => s.activeTrip);

export const useStartTrip = () => {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (tripId: string) => trip.startTrip(tripId),
    onMutate: (tripId) =>
      dispatch(tripPhaseSet({ tripId, phase: "starting" })),
    onSuccess: (t) => {
      dispatch(tripPhaseSet({ tripId: t._id, phase: "active" }));
      qc.invalidateQueries({ queryKey: activeTripKey });
    },
    onError: (_e, tripId) =>
      dispatch(tripPhaseSet({ tripId, phase: "checklist" })),
  });
};

export const useTripAction = () => {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: ({
      tripId,
      action,
    }: {
      tripId: string;
      action: "pause" | "resume" | "end";
    }) => trip.tripAction(tripId, action),
    onSuccess: (t, { action }) => {
      if (action === "end") {
        dispatch(tripPhaseSet({ tripId: t._id, phase: "summary" }));
      } else {
        dispatch(
          tripPhaseSet({
            tripId: t._id,
            phase: action === "pause" ? "paused" : "active",
          })
        );
      }
      qc.invalidateQueries({ queryKey: activeTripKey });
    },
  });
};

export const useSubmitChecklist = () =>
  useMutation({
    mutationFn: ({
      tripId,
      checklist,
    }: {
      tripId: string;
      checklist: ChecklistInput;
    }) => trip.submitChecklist(tripId, checklist),
  });

export const useChecklistBlock = (tripId: string | null) =>
  useQuery({
    queryKey: ["driver", "checklist-block", tripId],
    queryFn: () => trip.getChecklistBlock(tripId as string),
    enabled: Boolean(tripId),
  });

/** Clear the trip flow (after the driver confirms the summary). */
export const useEndTripFlow = () => {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  return useCallback(() => {
    dispatch(tripCleared());
    qc.invalidateQueries({ queryKey: activeTripKey });
  }, [dispatch, qc]);
};
