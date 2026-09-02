"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as svc from "../services/driver.service";

const today = () => new Date().toISOString().slice(0, 10);

export const driverKeys = {
  assignment: (date: string) => ["driver", "assignment", date] as const,
  performance: ["driver", "performance"] as const,
};

export const useAssignment = (date: string = today()) =>
  useQuery({
    queryKey: driverKeys.assignment(date),
    queryFn: () => svc.getAssignment(date),
    staleTime: 60_000,
  });

export const useRequestAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.requestAssignment,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver", "assignment"] }),
  });
};

export const useCheckIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.checkIn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver", "assignment"] }),
  });
};

export const useCheckOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.checkOut,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["driver", "assignment"] }),
  });
};

export const usePerformance = () =>
  useQuery({
    queryKey: driverKeys.performance,
    queryFn: svc.getMyPerformance,
  });
