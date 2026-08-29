"use client";

import { useCallback, useEffect, useState } from "react";
import * as incidentService from "./incident.service";
import type { Incident } from "./incident.types";

export const useIncidents = () => {
  const [data, setData] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await incidentService.getAllIncidents());
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
