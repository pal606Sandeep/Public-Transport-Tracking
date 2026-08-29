"use client";

import { useCallback, useEffect, useState } from "react";
import * as routeService from "./route.service";
import type { Route } from "./route.types";

export const useRoutes = () => {
  const [data, setData] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await routeService.getAllRoutes());
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
