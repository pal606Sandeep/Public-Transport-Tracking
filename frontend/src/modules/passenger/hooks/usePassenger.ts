"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as svc from "../services/passenger.service";
import type {
  Favourites,
  FavouriteType,
  PreferencesPatch,
  SavedLocationInput,
} from "../constant/passenger.types";

export const passengerKeys = {
  profile: ["passenger", "profile"] as const,
  favourites: ["passenger", "favourites"] as const,
  savedLocations: ["passenger", "saved-locations"] as const,
};

/* ---- profile & preferences --------------------------------------------- */

export const usePassengerProfile = () =>
  useQuery({
    queryKey: passengerKeys.profile,
    queryFn: svc.getPassengerProfile,
  });

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PreferencesPatch) => svc.updatePreferences(patch),
    onSuccess: (passenger) =>
      qc.setQueryData(passengerKeys.profile, passenger),
  });
};

/* ---- favourites ------------------------------------------------------- */

export const useFavourites = () =>
  useQuery({
    queryKey: passengerKeys.favourites,
    queryFn: svc.listFavourites,
  });

export const useToggleFavourite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      type,
      targetId,
      active,
    }: {
      type: FavouriteType;
      targetId: string;
      active: boolean;
    }) =>
      active
        ? svc.removeFavourite(type, targetId)
        : svc.addFavourite(type, targetId),
    onMutate: async ({ type, targetId, active }) => {
      await qc.cancelQueries({ queryKey: passengerKeys.favourites });
      const prev = qc.getQueryData<Favourites>(passengerKeys.favourites);
      if (prev) {
        const key = type === "route" ? "routes" : "stops";
        const next: Favourites = {
          ...prev,
          [key]: active
            ? prev[key].filter((id) => id !== targetId)
            : [...prev[key], targetId],
        };
        qc.setQueryData(passengerKeys.favourites, next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(passengerKeys.favourites, ctx.prev);
    },
    onSettled: (data) => {
      if (data) qc.setQueryData(passengerKeys.favourites, data);
    },
  });
};

/* ---- saved locations ------------------------------------------------- */

export const useSavedLocations = () =>
  useQuery({
    queryKey: passengerKeys.savedLocations,
    queryFn: svc.listSavedLocations,
  });

export const useCreateSavedLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SavedLocationInput) => svc.createSavedLocation(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: passengerKeys.savedLocations }),
  });
};

export const useDeleteSavedLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteSavedLocation(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: passengerKeys.savedLocations }),
  });
};
