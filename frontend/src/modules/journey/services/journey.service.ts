import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  JourneyResult,
  RouteBrief,
  StopBrief,
} from "../constant/journey.types";

/** GET /api/v1/discovery/stops?q= | ?lat=&lng=&radius= */
export const searchStops = async (params: {
  q?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}): Promise<{ stops: StopBrief[]; pagination: Pagination }> => {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.lat != null && params.lng != null) {
    p.set("lat", String(params.lat));
    p.set("lng", String(params.lng));
    p.set("radius", String(params.radius ?? 2000));
  }
  p.set("limit", String(params.limit ?? 15));
  const res = await api.get<{ stops: StopBrief[]; pagination: Pagination }>(
    `/discovery/stops?${p.toString()}`
  );
  return {
    stops: res.data?.stops ?? [],
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 15 },
  };
};

/** GET /api/v1/discovery/routes?q= */
export const searchRoutes = async (
  q: string
): Promise<{ routes: RouteBrief[]; pagination: Pagination }> => {
  const res = await api.get<{ routes: RouteBrief[]; pagination: Pagination }>(
    `/discovery/routes?q=${encodeURIComponent(q)}&limit=25`
  );
  return {
    routes: res.data?.routes ?? [],
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 25 },
  };
};

/** GET /api/v1/discovery/find-bus?from=<stopId>&to=<stopId> */
export const findBus = async (
  from: string,
  to: string
): Promise<{ from: StopBrief; to: StopBrief; routes: unknown[] }> => {
  const res = await api.get<{
    from: StopBrief;
    to: StopBrief;
    routes: unknown[];
  }>(`/discovery/find-bus?from=${from}&to=${to}`);
  return res.data as { from: StopBrief; to: StopBrief; routes: unknown[] };
};

/** GET /api/v1/journeys?from=&to=&time=&maxTransfers= */
export const planJourney = async (input: {
  from: string; // stopId or "lat,lng"
  to: string;
  time?: number;
  maxTransfers?: 0 | 1;
}): Promise<JourneyResult> => {
  const p = new URLSearchParams();
  p.set("from", input.from);
  p.set("to", input.to);
  if (input.time) p.set("time", String(input.time));
  p.set("maxTransfers", String(input.maxTransfers ?? 1));
  const res = await api.get<JourneyResult>(`/journeys?${p.toString()}`);
  return res.data as JourneyResult;
};
