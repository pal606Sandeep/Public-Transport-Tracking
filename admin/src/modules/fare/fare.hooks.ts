"use client";

import { useCallback, useEffect, useState } from "react";
import * as fareService from "./fare.service";
import type { Fare } from "./fare.types";

export const useFares = () => {
  const [data, setData] = useState<Fare[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await fareService.getAllFares());
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
