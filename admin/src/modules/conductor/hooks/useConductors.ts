"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/conductor.service";
import type {
  ConductorInput,
  ConductorListParams,
  ConductorStatus,
} from "../constant/conductor.types";

export const conductorKeys = {
  all: ["conductors"] as const,
  list: (p: ConductorListParams) => ["conductors", "list", p] as const,
  detail: (id: string) => ["conductors", "detail", id] as const,
};

export const useConductors = (params: ConductorListParams) =>
  useQuery({
    queryKey: conductorKeys.list(params),
    queryFn: () => svc.listConductors(params),
  });

export const useConductor = (id: string) =>
  useQuery({
    queryKey: conductorKeys.detail(id),
    queryFn: () => svc.getConductor(id),
    enabled: Boolean(id),
  });

export const useCreateConductor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConductorInput) => svc.createConductor(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: conductorKeys.all }),
  });
};

export const useUpdateConductor = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ConductorInput>) =>
      svc.updateConductor(id, input),
    onSuccess: (conductor) => {
      qc.setQueryData(conductorKeys.detail(id), conductor);
      qc.invalidateQueries({ queryKey: conductorKeys.all });
    },
  });
};

export const useSetConductorStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: ConductorStatus) =>
      svc.setConductorStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: conductorKeys.all }),
  });
};

export const useAssignConductor = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      vehicleId: string | null;
      routeId: string | null;
      scheduleId: string | null;
    }) => svc.assignConductor(id, body),
    onSuccess: (conductor) => {
      qc.setQueryData(conductorKeys.detail(id), conductor);
      qc.invalidateQueries({ queryKey: conductorKeys.all });
    },
  });
};

export const useDeleteConductor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteConductor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: conductorKeys.all }),
  });
};
