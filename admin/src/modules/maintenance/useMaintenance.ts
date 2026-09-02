"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./maintenance.service";
import type {
  MaintenanceInput,
  VehicleDocumentInput,
} from "./maintenance.types";

export const maintKeys = {
  records: (vehicleId: string) => ["maintenance", vehicleId, "records"] as const,
  documents: (vehicleId: string) =>
    ["maintenance", vehicleId, "documents"] as const,
};

export const useMaintenanceRecords = (vehicleId: string) =>
  useQuery({
    queryKey: maintKeys.records(vehicleId),
    queryFn: () => svc.listMaintenance(vehicleId, { limit: 50 }),
    enabled: Boolean(vehicleId),
  });

export const useVehicleDocuments = (vehicleId: string) =>
  useQuery({
    queryKey: maintKeys.documents(vehicleId),
    queryFn: () => svc.listDocuments(vehicleId),
    enabled: Boolean(vehicleId),
  });

export const useMaintenanceMutations = (vehicleId: string) => {
  const qc = useQueryClient();
  const inv = () =>
    qc.invalidateQueries({ queryKey: maintKeys.records(vehicleId) });

  const create = useMutation({
    mutationFn: (input: MaintenanceInput) =>
      svc.createMaintenance(vehicleId, input),
    onSuccess: inv,
  });
  const complete = useMutation({
    mutationFn: (id: string) => svc.completeMaintenance(vehicleId, id),
    onSuccess: inv,
  });
  const remove = useMutation({
    mutationFn: (id: string) => svc.deleteMaintenance(vehicleId, id),
    onSuccess: inv,
  });
  return { create, complete, remove };
};

export const useDocumentMutations = (vehicleId: string) => {
  const qc = useQueryClient();
  const inv = () =>
    qc.invalidateQueries({ queryKey: maintKeys.documents(vehicleId) });

  const create = useMutation({
    mutationFn: (input: VehicleDocumentInput) =>
      svc.createDocument(vehicleId, input),
    onSuccess: inv,
  });
  const remove = useMutation({
    mutationFn: (id: string) => svc.deleteDocument(vehicleId, id),
    onSuccess: inv,
  });
  return { create, remove };
};
