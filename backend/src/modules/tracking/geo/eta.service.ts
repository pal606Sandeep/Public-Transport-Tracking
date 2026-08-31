import { loadRouteCache, getDistanceAlongRoute } from "./geospatial.service.js";
import { getVehicleETA, updateVehicleETA } from "../tracking.service.js";
import logger from "../../../utils/logger.js";

export interface ETAResult {
  vehicleId: string;
  tripId: string;
  nextStopId: string;
  nextStopName: string;
  etaSeconds: number;
  etaTimestamp: number;
  distanceMeters: number;
  speedKmh: number;
  perStopETA: Array<{
    stopId: string;
    sequence: number;
    distanceMeters: number;
    etaSeconds: number;
  }>;
}

export const calculateETA = async (
  vehicleId: string,
  tripId: string,
  routeId: string,
  vehicleLat: number,
  vehicleLng: number,
  speedKmh: number
): Promise<ETAResult | null> => {
  const route = await loadRouteCache(routeId);
  if (!route || route.stops.length === 0) return null;

  const vehicleDistMeters = getDistanceAlongRoute(route.geometry, vehicleLat, vehicleLng);
  const currentSpeed = speedKmh > 0 ? speedKmh : 5;
  const currentSpeedMs = currentSpeed / 3.6;

  const perStopETA: ETAResult["perStopETA"] = [];
  let nextStopId = "";
  let nextStopName = "";
  let nextStopDist = Infinity;

  for (const stop of route.stops) {
    const stopDist = getDistanceAlongRoute(route.geometry, stop.lat, stop.lng);
    const remainingDist = Math.max(0, stopDist - vehicleDistMeters);
    const etaSeconds = currentSpeedMs > 0 ? Math.round(remainingDist / currentSpeedMs) : -1;

    perStopETA.push({
      stopId: stop.stopId,
      sequence: stop.sequence,
      distanceMeters: Math.round(remainingDist),
      etaSeconds,
    });

    if (remainingDist > 0 && remainingDist < nextStopDist) {
      nextStopDist = remainingDist;
      nextStopId = stop.stopId;
      nextStopName = stop.stopId;
    }
  }

  const nextETA = perStopETA.find((s) => s.stopId === nextStopId);

  const result: ETAResult = {
    vehicleId,
    tripId,
    nextStopId,
    nextStopName,
    etaSeconds: nextETA?.etaSeconds ?? 0,
    etaTimestamp: Date.now() + (nextETA?.etaSeconds ?? 0) * 1000,
    distanceMeters: Math.round(nextStopDist),
    speedKmh: currentSpeed,
    perStopETA,
  };

  await updateVehicleETA({
    vehicleId,
    tripId,
    nextStopId,
    nextStopName: nextStopName,
    etaSeconds: result.etaSeconds,
    distanceMeters: result.distanceMeters,
    updatedAt: Date.now(),
  });

  return result;
};
