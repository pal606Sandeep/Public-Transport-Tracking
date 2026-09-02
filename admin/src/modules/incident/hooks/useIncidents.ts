"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/incident.service";
import type {
  IncidentListParams,
  CreateIncidentInput,
} from "../constant/incident.types";

export const incidentKeys = {
  all: ["incidents"] as const,
  list: (p: IncidentListParams) => ["incidents", "list", p] as const,
  detail: (id: string) => ["incidents", "detail", id] as const,
};

export const useIncidents = (params: IncidentListParams) =>
  useQuery({
    queryKey: incidentKeys.list(params),
    queryFn: () => svc.listIncidents(params),
  });

export const useIncident = (id: string) =>
  useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => svc.getIncident(id),
    enabled: Boolean(id),
  });

export const useCreateIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) => svc.createIncident(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: incidentKeys.all }),
  });
};

export const useIncidentActions = (id: string) => {
  const qc = useQueryClient();
  const settle = (incident: unknown) => {
    qc.setQueryData(incidentKeys.detail(id), incident);
    qc.invalidateQueries({ queryKey: incidentKeys.all });
  };

  const acknowledge = useMutation({
    mutationFn: () => svc.acknowledgeIncident(id),
    onSuccess: settle,
  });
  const assign = useMutation({
    mutationFn: (assignedTo: string) => svc.assignIncident(id, assignedTo),
    onSuccess: settle,
  });
  const resolve = useMutation({
    mutationFn: (note?: string) => svc.resolveIncident(id, note),
    onSuccess: settle,
  });
  const close = useMutation({
    mutationFn: () => svc.closeIncident(id),
    onSuccess: settle,
  });
  const update = useMutation({
    mutationFn: (input: Partial<Omit<CreateIncidentInput, "type">>) =>
      svc.updateIncident(id, input),
    onSuccess: settle,
  });

  return { acknowledge, assign, resolve, close, update };
};

export const useDeleteIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteIncident(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: incidentKeys.all }),
  });
};
