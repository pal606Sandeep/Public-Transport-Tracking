"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./complaint.service";
import type { ComplaintListParams } from "./complaint.types";

export const complaintKeys = {
  all: ["complaints"] as const,
  list: (p: ComplaintListParams) => ["complaints", "list", p] as const,
  detail: (id: string) => ["complaints", "detail", id] as const,
  history: (id: string) => ["complaints", "history", id] as const,
};

export const useComplaints = (params: ComplaintListParams) =>
  useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => svc.listComplaints(params),
  });

export const useComplaint = (id: string) =>
  useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: () => svc.getComplaint(id),
    enabled: Boolean(id),
  });

export const useComplaintHistory = (id: string) =>
  useQuery({
    queryKey: complaintKeys.history(id),
    queryFn: () => svc.getComplaintHistory(id),
    enabled: Boolean(id),
  });

export const useComplaintActions = (id: string) => {
  const qc = useQueryClient();
  const settle = (complaint: unknown) => {
    qc.setQueryData(complaintKeys.detail(id), complaint);
    qc.invalidateQueries({ queryKey: complaintKeys.all });
    qc.invalidateQueries({ queryKey: complaintKeys.history(id) });
  };

  const assign = useMutation({
    mutationFn: ({ assigneeId, note }: { assigneeId: string; note?: string }) =>
      svc.assignComplaint(id, assigneeId, note),
    onSuccess: settle,
  });
  const update = useMutation({
    mutationFn: (input: { priority?: string; status?: string; note?: string }) =>
      svc.updateComplaint(id, input),
    onSuccess: settle,
  });
  const escalate = useMutation({
    mutationFn: ({
      reason,
      assigneeId,
    }: {
      reason: string;
      assigneeId?: string;
    }) => svc.escalateComplaint(id, reason, assigneeId),
    onSuccess: settle,
  });
  const resolve = useMutation({
    mutationFn: (note: string) => svc.resolveComplaint(id, note),
    onSuccess: settle,
  });
  const close = useMutation({
    mutationFn: (note?: string) => svc.closeComplaint(id, note),
    onSuccess: settle,
  });

  return { assign, update, escalate, resolve, close };
};
