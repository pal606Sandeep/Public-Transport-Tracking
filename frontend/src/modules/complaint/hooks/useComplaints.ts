"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as svc from "../services/complaint.service";

export const complaintKeys = {
  list: ["complaints", "mine"] as const,
  detail: (id: string) => ["complaints", "detail", id] as const,
};

export const useMyComplaints = () =>
  useQuery({
    queryKey: complaintKeys.list,
    queryFn: () => svc.listMyComplaints({ limit: 30 }),
  });

export const useComplaint = (id: string) =>
  useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: () => svc.getComplaint(id),
    enabled: Boolean(id),
  });

export const useCreateComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.createComplaint,
    onSuccess: () => qc.invalidateQueries({ queryKey: complaintKeys.list }),
  });
};

export const useComplaintFeedback = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; comment?: string }) =>
      svc.submitComplaintFeedback(id, input),
    onSuccess: (c) => qc.setQueryData(complaintKeys.detail(id), c),
  });
};
