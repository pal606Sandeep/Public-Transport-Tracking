import { loadRouteCache, getDistanceToRoute, getNearestPointOnRoute } from "./geospatial.service.js";
import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import { publishEvent } from "../event-bus.service.js";
import logger from "../../../utils/logger.js";

export interface DeviationResult {
  vehicleId: string;
  tripId: string;
  routeId: string;
  isDeviated: boolean;
  distanceMeters: number;
  durationAboveThresholdSeconds: number;
  nearestPointOnRoute: { lat: number; lng: number };
}

interface DeviationState {
  vehicleId: string;
  tripId: string;
  firstDeviatedAt: number | null;
  isDeviated: boolean;
  lastEmittedAt: number;
}

const deviationStates = new Map<string, DeviationState>();

export const detectRouteDeviation = async (
  vehicleId: string,
  tripId: string,
  routeId: string,
  vehicleLat: number,
  vehicleLng: number,
  timestamp: number
): Promise<DeviationResult | null> => {
  const route = await loadRouteCache(routeId);
  if (!route) return null;

  const distanceToRoute = getDistanceToRoute(route.geometry, vehicleLat, vehicleLng);
  const nearestPoint = getNearestPointOnRoute(route.geometry, vehicleLat, vehicleLng);

  const stateKey = `${vehicleId}:${tripId}`;
  let state = deviationStates.get(stateKey);
  if (!state) {
    state = {
      vehicleId,
      tripId,
      firstDeviatedAt: null,
      isDeviated: false,
      lastEmittedAt: 0,
    };
    deviationStates.set(stateKey, state);
  }

  const settings = await getTrackingSettings();
  const isAboveThreshold = distanceToRoute > settings.deviationThresholdMeters;

  if (isAboveThreshold) {
    if (!state.firstDeviatedAt) {
      state.firstDeviatedAt = timestamp;
    }

    const durationAboveThreshold = Math.round((timestamp - state.firstDeviatedAt) / 1000);

    if (durationAboveThreshold >= settings.deviationDwellSeconds && !state.isDeviated) {
      state.isDeviated = true;
      state.lastEmittedAt = timestamp;

      logger.warn(`Route deviation detected for vehicle ${vehicleId}`, {
        vehicleId,
        tripId,
        routeId,
        deviationDistance: Math.round(distanceToRoute),
        durationAboveThreshold,
      });

      await publishEvent("ROUTE_DEVIATION", {
        vehicleId,
        tripId,
        routeId,
        deviationDistanceMeters: Math.round(distanceToRoute),
        thresholdMeters: settings.deviationThresholdMeters,
        durationAboveThresholdSeconds: durationAboveThreshold,
        vehicleLocation: { lat: vehicleLat, lng: vehicleLng },
        nearestPointOnRoute: nearestPoint,
        timestamp,
      });

      return {
        vehicleId,
        tripId,
        routeId,
        isDeviated: true,
        distanceMeters: Math.round(distanceToRoute),
        durationAboveThresholdSeconds: durationAboveThreshold,
        nearestPointOnRoute: nearestPoint,
      };
    }
  } else {
    if (state.isDeviated) {
      logger.info(`Vehicle ${vehicleId} returned to route`, { vehicleId, tripId });
      state.firstDeviatedAt = null;
      state.isDeviated = false;
      return {
        vehicleId,
        tripId,
        routeId,
        isDeviated: false,
        distanceMeters: Math.round(distanceToRoute),
        durationAboveThresholdSeconds: 0,
        nearestPointOnRoute: nearestPoint,
      };
    }
    state.firstDeviatedAt = null;
    state.isDeviated = false;
  }

  return null;
};

export const getDeviationState = (vehicleId: string, tripId: string): DeviationState | null => {
  return deviationStates.get(`${vehicleId}:${tripId}`) ?? null;
};

export const clearDeviationState = (vehicleId: string, tripId: string): void => {
  deviationStates.delete(`${vehicleId}:${tripId}`);
};
