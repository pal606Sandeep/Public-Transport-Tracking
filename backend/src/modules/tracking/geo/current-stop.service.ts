import { loadRouteCache, getStopAlongRoute } from "./geospatial.service.js";
import logger from "../../../utils/logger.js";

export interface CurrentStopInfo {
  previousStopId: string | null;
  currentStopId: string | null;
  nextStopId: string | null;
  distanceToNextMeters: number;
  distanceFromPreviousMeters: number;
  distanceAlongRouteMeters: number;
  timestamp: number;
}

export const detectCurrentStop = async (
  routeId: string,
  vehicleLat: number,
  vehicleLng: number
): Promise<CurrentStopInfo | null> => {
  const route = await loadRouteCache(routeId);
  if (!route || route.stops.length === 0) return null;

  const result = getStopAlongRoute(
    route.geometry,
    route.stops,
    vehicleLat,
    vehicleLng
  );

  return {
    previousStopId: result.previous?.stopId ?? null,
    currentStopId: result.current?.stopId ?? null,
    nextStopId: result.next?.stopId ?? null,
    distanceToNextMeters: Math.round(result.distanceToNext),
    distanceFromPreviousMeters: Math.round(result.distanceFromPrevious),
    distanceAlongRouteMeters: Math.round(result.distanceAlongRouteMeters),
    timestamp: Date.now(),
  };
};
