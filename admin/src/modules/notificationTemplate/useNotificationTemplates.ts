"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./notificationTemplate.service";
import type { TemplateInput } from "./notificationTemplate.service";

const KEY = ["notification-templates"] as const;

export const useTemplates = () =>
  useQuery({ queryKey: KEY, queryFn: svc.listTemplates });

export const useUpsertTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateInput) => svc.upsertTemplate(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => svc.deleteTemplate(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const usePreviewTemplate = () =>
  useMutation({
    mutationFn: ({
      key,
      vars,
    }: {
      key: string;
      vars: Record<string, unknown>;
    }) => svc.previewTemplate(key, vars),
  });
