import { api } from "@/utils/apiClient";
import type { GpsFix } from "../constant/driver.types";

/** POST /api/v1/tracking/location — single fix, returns 202. */
export const sendLocation = (fix: GpsFix): Promise<unknown> =>
  api.post("/tracking/location", fix);

/** POST /api/v1/tracking/location/bulk — flush a backlog (Idempotency-Key). Max 100. */
export const sendLocationBulk = (fixes: GpsFix[]): Promise<unknown> =>
  api.post(
    "/tracking/location/bulk",
    { locations: fixes.slice(0, 100) },
    { idempotent: true }
  );

/** POST /api/v1/tracking/heartbeat — liveness while foregrounded but stationary. */
export const sendHeartbeat = (input: {
  vehicleId: string;
  tripId?: string;
  driverId?: string;
}): Promise<unknown> =>
  api.post("/tracking/heartbeat", { ...input, timestamp: Date.now() });

/** POST /api/v1/tracking/sos */
export const sendSos = async (input: {
  vehicleId: string;
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  message?: string;
}): Promise<{ traceId: string }> => {
  const res = await api.post<{ traceId: string }>("/tracking/sos", input);
  return res.data ?? { traceId: "" };
};
