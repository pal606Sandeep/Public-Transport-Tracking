"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "./dashboard.service";

export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });
