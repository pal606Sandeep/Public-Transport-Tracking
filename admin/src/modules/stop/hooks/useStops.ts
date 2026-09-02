"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/stop.service";
import type { StopInput, StopListParams } from "../constant/stop.types";

export const stopKeys = {
  all: ["stops"] as const,
  list: (p: StopListParams) => ["stops", "list", p] as const,
  detail: (id: string) => ["stops", "detail", id] as const,
};

export const useStops = (params: StopListParams) =>
  useQuery({
    queryKey: stopKeys.list(params),
    queryFn: () => svc.listStops(params),
  });

export const useStop = (id: string) =>
  useQuery({
    queryKey: stopKeys.detail(id),
    queryFn: () => svc.getStop(id),
    enabled: Boolean(id),
  });

export const useCreateStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StopInput) => svc.createStop(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: stopKeys.all }),
  });
};

export const useUpdateStop = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<StopInput>) => svc.updateStop(id, input),
    onSuccess: (stop) => {
      qc.setQueryData(stopKeys.detail(id), stop);
      qc.invalidateQueries({ queryKey: stopKeys.all });
    },
  });
};

export const useDeactivateStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deactivateStop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: stopKeys.all }),
  });
};

export const useDeleteStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteStop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: stopKeys.all }),
  });
};
