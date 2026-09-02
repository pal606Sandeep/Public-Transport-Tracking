"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/vehicle.service";
import type { VehicleInput, VehicleListParams } from "../constant/vehicle.types";

export const vehicleKeys = {
  all: ["vehicles"] as const,
  list: (p: VehicleListParams) => ["vehicles", "list", p] as const,
  detail: (id: string) => ["vehicles", "detail", id] as const,
};

export const useVehicles = (params: VehicleListParams) =>
  useQuery({
    queryKey: vehicleKeys.list(params),
    queryFn: () => svc.listVehicles(params),
  });

export const useVehicle = (id: string) =>
  useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => svc.getVehicle(id),
    enabled: Boolean(id),
  });

export const useCreateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VehicleInput) => svc.createVehicle(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
};

export const useUpdateVehicle = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<VehicleInput>) => svc.updateVehicle(id, input),
    onSuccess: (vehicle) => {
      qc.setQueryData(vehicleKeys.detail(id), vehicle);
      qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
};

export const useDeleteVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
};
