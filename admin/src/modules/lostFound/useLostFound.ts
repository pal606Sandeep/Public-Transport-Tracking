"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./lostFound.service";
import type { LostFoundListParams } from "./lostFound.types";

export const lfKeys = {
  all: ["lost-found"] as const,
  list: (p: LostFoundListParams) => ["lost-found", "list", p] as const,
  detail: (id: string) => ["lost-found", "detail", id] as const,
  matches: (id: string) => ["lost-found", "matches", id] as const,
};

export const useLostFoundList = (params: LostFoundListParams) =>
  useQuery({
    queryKey: lfKeys.list(params),
    queryFn: () => svc.listLostFound(params),
  });

export const useLostFoundItem = (id: string) =>
  useQuery({
    queryKey: lfKeys.detail(id),
    queryFn: () => svc.getLostFound(id),
    enabled: Boolean(id),
  });

export const useLostFoundMatches = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: lfKeys.matches(id),
    queryFn: () => svc.getMatches(id, 3),
    enabled: Boolean(id) && enabled,
  });

export const useLostFoundActions = (id: string) => {
  const qc = useQueryClient();
  const settle = () => {
    qc.invalidateQueries({ queryKey: lfKeys.all });
  };

  const assign = useMutation({
    mutationFn: ({ assigneeId, note }: { assigneeId: string; note?: string }) =>
      svc.assignLostFound(id, assigneeId, note),
    onSuccess: (item) => {
      qc.setQueryData(lfKeys.detail(id), item);
      settle();
    },
  });
  const update = useMutation({
    mutationFn: (input: { status?: string; note?: string }) =>
      svc.updateLostFound(id, input),
    onSuccess: (item) => {
      qc.setQueryData(lfKeys.detail(id), item);
      settle();
    },
  });
  const confirmReturn = useMutation({
    mutationFn: (input: {
      matchId: string;
      returnedTo: string;
      note?: string;
    }) => svc.confirmReturn(id, input),
    onSuccess: (res) => {
      qc.setQueryData(lfKeys.detail(id), res.item);
      qc.invalidateQueries({ queryKey: lfKeys.matches(id) });
      settle();
    },
  });
  const close = useMutation({
    mutationFn: (note?: string) => svc.closeLostFound(id, note),
    onSuccess: (item) => {
      qc.setQueryData(lfKeys.detail(id), item);
      settle();
    },
  });

  return { assign, update, confirmReturn, close };
};
