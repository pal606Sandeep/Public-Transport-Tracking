"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./serviceAlert.service";
import type {
  ServiceAlertInput,
  ServiceAlertListParams,
} from "./serviceAlert.types";

export const saKeys = {
  all: ["service-alerts"] as const,
  list: (p: ServiceAlertListParams) => ["service-alerts", "list", p] as const,
  detail: (id: string) => ["service-alerts", "detail", id] as const,
};

export const useServiceAlerts = (params: ServiceAlertListParams) =>
  useQuery({
    queryKey: saKeys.list(params),
    queryFn: () => svc.listServiceAlerts(params),
  });

export const useServiceAlert = (id: string) =>
  useQuery({
    queryKey: saKeys.detail(id),
    queryFn: () => svc.getServiceAlert(id),
    enabled: Boolean(id),
  });

export const useCreateServiceAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceAlertInput) => svc.createServiceAlert(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: saKeys.all }),
  });
};

export const useServiceAlertActions = (id: string) => {
  const qc = useQueryClient();
  const settle = (alert: unknown) => {
    qc.setQueryData(saKeys.detail(id), alert);
    qc.invalidateQueries({ queryKey: saKeys.all });
  };

  const update = useMutation({
    mutationFn: (input: Partial<Omit<ServiceAlertInput, "status">>) =>
      svc.updateServiceAlert(id, input),
    onSuccess: settle,
  });
  const publish = useMutation({
    mutationFn: () => svc.publishServiceAlert(id),
    onSuccess: settle,
  });
  const cancel = useMutation({
    mutationFn: () => svc.cancelServiceAlert(id),
    onSuccess: settle,
  });

  return { update, publish, cancel };
};

export const useDeleteServiceAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteServiceAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: saKeys.all }),
  });
};
