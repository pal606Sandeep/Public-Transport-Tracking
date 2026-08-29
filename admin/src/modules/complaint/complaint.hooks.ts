"use client";

import { useCallback, useEffect, useState } from "react";
import * as complaintService from "./complaint.service";
import type { Complaint } from "./complaint.types";

export const useComplaints = () => {
  const [data, setData] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setData(await complaintService.getAllComplaints());
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
