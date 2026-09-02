"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/lostFound.service";

export const lostFoundKeys = {
  list: ["lost-found", "mine"] as const,
  detail: (id: string) => ["lost-found", "detail", id] as const,
};

export const useMyLostFound = () =>
  useQuery({
    queryKey: lostFoundKeys.list,
    queryFn: () => svc.listMyLostFound({ limit: 30 }),
  });

export const useLostFoundItem = (id: string) =>
  useQuery({
    queryKey: lostFoundKeys.detail(id),
    queryFn: () => svc.getLostFoundItem(id),
    enabled: Boolean(id),
  });

export const useCreateLostFound = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.createLostFound,
    onSuccess: () => qc.invalidateQueries({ queryKey: lostFoundKeys.list }),
  });
};
