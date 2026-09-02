"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/driver.service";
import type {
  DriverInput,
  DriverListParams,
  DriverStatus,
} from "../constant/driver.types";

export const driverKeys = {
  all: ["drivers"] as const,
  list: (p: DriverListParams) => ["drivers", "list", p] as const,
  detail: (id: string) => ["drivers", "detail", id] as const,
};

export const useDrivers = (params: DriverListParams) =>
  useQuery({
    queryKey: driverKeys.list(params),
    queryFn: () => svc.listDrivers(params),
  });

export const useDriver = (id: string) =>
  useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => svc.getDriver(id),
    enabled: Boolean(id),
  });

export const useCreateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DriverInput) => svc.createDriver(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: driverKeys.all }),
  });
};

export const useUpdateDriver = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DriverInput>) => svc.updateDriver(id, input),
    onSuccess: (driver) => {
      qc.setQueryData(driverKeys.detail(id), driver);
      qc.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
};

export const useSetDriverStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: DriverStatus) => svc.setDriverStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: driverKeys.all }),
  });
};

export const useAssignDriver = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      vehicleId: string | null;
      routeId: string | null;
      scheduleId: string | null;
    }) => svc.assignDriver(id, body),
    onSuccess: (driver) => {
      qc.setQueryData(driverKeys.detail(id), driver);
      qc.invalidateQueries({ queryKey: driverKeys.all });
    },
  });
};

export const useDeleteDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteDriver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: driverKeys.all }),
  });
};
