"use client";

import { useCallback, useEffect, useState } from "react";
import * as serviceAlertService from "./serviceAlert.service";
import type { ServiceAlert } from "./serviceAlert.types";

export const useServiceAlerts = () => {
  const [data, setData] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await serviceAlertService.getAllServiceAlerts());
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
