import { api } from "@/utils/apiClient";
import type { ClientConfig } from "@/store/slices/config.slice";

/** GET /api/v1/config — role-filtered client bootstrap payload. */
export const fetchClientConfig = async (): Promise<ClientConfig> => {
  const res = await api.get<ClientConfig>("/config");
  return res.data as ClientConfig;
};

/** GET /api/v1/time — server epoch ms, for clock-skew correction. */
export const fetchServerTime = async (): Promise<number> => {
  const res = await api.get<{ serverTime: number }>("/time");
  return res.data?.serverTime ?? Date.now();
};
