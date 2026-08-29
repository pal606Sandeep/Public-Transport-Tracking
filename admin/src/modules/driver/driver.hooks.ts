"use client";

import { useCallback, useEffect, useState } from "react";
import * as driverService from "./driver.service";
import type { Driver } from "./driver.types";

export const useDrivers = () => {
  const [data, setData] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await driverService.getAllDrivers());
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
