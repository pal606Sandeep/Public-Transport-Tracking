"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./assignmentRequest.service";
import type { AssignmentRequestStatus } from "./assignmentRequest.service";

const KEY = ["assignment-requests"] as const;

export const useAssignmentRequests = (params: {
  page?: number;
  limit?: number;
  status?: AssignmentRequestStatus;
}) =>
  useQuery({
    queryKey: [...KEY, "list", params],
    queryFn: () => svc.listAssignmentRequests(params),
  });

export const useDecideAssignmentRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      note?: string;
    }) => svc.decideAssignmentRequest(id, decision, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
