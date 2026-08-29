"use client";

import { useCallback, useEffect, useState } from "react";
import * as conductorService from "./conductor.service";
import type { Conductor } from "./conductor.types";

export const useConductors = () => {
  const [data, setData] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await conductorService.getAllConductors());
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
