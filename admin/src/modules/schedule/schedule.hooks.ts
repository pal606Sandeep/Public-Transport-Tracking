"use client";

import { useCallback, useEffect, useState } from "react";
import * as scheduleService from "./schedule.service";
import type { Schedule } from "./schedule.types";

export const useSchedules = () => {
  const [data, setData] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await scheduleService.getAllSchedules());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
};
