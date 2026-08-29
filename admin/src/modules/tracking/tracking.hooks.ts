"use client";

import { useCallback, useEffect, useState } from "react";
import * as trackingService from "./tracking.service";
import type { VehicleLocation } from "./tracking.types";

export const useVehicleLocation = (vehicleId: string) => {
  const [location, setLocation] = useState<VehicleLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    if (!vehicleId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setLocation(await trackingService.getVehicleLocation(vehicleId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { location, loading, error, refetch };
};
