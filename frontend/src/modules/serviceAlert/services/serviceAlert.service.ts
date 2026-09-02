import { api } from "@/utils/apiClient";
import type { ServiceAlert } from "../constant/serviceAlert.types";

/** GET /api/v1/service-alerts?routeId=&stopId= — published + active only. */
export const listServiceAlerts = async (params: {
  routeId?: string;
  stopId?: string;
} = {}): Promise<ServiceAlert[]> => {
  const p = new URLSearchParams();
  if (params.routeId) p.set("routeId", params.routeId);
  if (params.stopId) p.set("stopId", params.stopId);
  const qs = p.toString();
  const res = await api.get<{ serviceAlerts: ServiceAlert[] }>(
    `/service-alerts${qs ? `?${qs}` : ""}`
  );
  return res.data?.serviceAlerts ?? [];
};
