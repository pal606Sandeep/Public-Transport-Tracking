"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "../services/schedule.service";
import type {
  ScheduleInput,
  ScheduleListParams,
} from "../constant/schedule.types";

export const scheduleKeys = {
  all: ["schedules"] as const,
  list: (p: ScheduleListParams) => ["schedules", "list", p] as const,
  detail: (id: string) => ["schedules", "detail", id] as const,
};

export const useSchedules = (params: ScheduleListParams) =>
  useQuery({
    queryKey: scheduleKeys.list(params),
    queryFn: () => svc.listSchedules(params),
  });

export const useSchedule = (id: string) =>
  useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => svc.getSchedule(id),
    enabled: Boolean(id),
  });

export const useCreateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleInput) => svc.createSchedule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
};

export const useUpdateSchedule = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ScheduleInput>) => svc.updateSchedule(id, input),
    onSuccess: (schedule) => {
      qc.setQueryData(scheduleKeys.detail(id), schedule);
      qc.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
};

export const useDeleteSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteSchedule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleKeys.all }),
  });
};

export const useGenerateTrips = (id: string) =>
  useMutation({
    mutationFn: (range: { from: string; to: string }) =>
      svc.generateTrips(id, range),
  });
