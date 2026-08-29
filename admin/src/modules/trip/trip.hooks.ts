"use client";

import { useCallback, useEffect, useState } from "react";
import * as tripService from "./trip.service";
import type { Trip } from "./trip.types";

export const useTrips = () => {
  const [data, setData] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await tripService.getAllTrips());
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
