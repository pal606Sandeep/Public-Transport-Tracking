"use client";

import { useCallback, useEffect, useState } from "react";
import * as maintenanceService from "./maintenance.service";
import type { MaintenanceRecord } from "./maintenance.types";

export const useMaintenanceRecords = () => {
  const [data, setData] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await maintenanceService.getAllMaintenanceRecords());
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
