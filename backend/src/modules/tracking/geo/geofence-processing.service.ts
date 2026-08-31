import { loadRouteCache, getStopAlongRoute, getDistanceToRoute, getNearestPointOnRoute } from "./geospatial.service.js";
import { isWithinGeofence } from "../geofence.util.js";
import { getTrackingSettings } from "../settings/tracking-settings.service.js";
import { getDistanceInMeters } from "../../../utils/distance.util.js";
import logger from "../../../utils/logger.js";

export type GeofenceEventType =
  | "vehicle:approaching"
  | "vehicle:arriving"
  | "vehicle:arrived"
  | "vehicle:left"
  | "depot:arrival"
  | "depot:departure";

export interface GeofenceResult {
  eventType: GeofenceEventType;
  vehicleId: string;
  tripId: string;
  routeId: string;
  stopId: string;
  sequence: number;
  distanceMeters: number;
  timestamp: number;
  lat: number;
  lng: number;
}

interface VehicleGeofenceState {
  vehicleId: string;
  tripId: string;
  lastStopId: string | null;
  lastEventType: GeofenceEventType | null;
  arrivedAt: number | null;
}

const vehicleStates = new Map<string, VehicleGeofenceState>();

const APPROACHING_MULTIPLIER = 3;
const ARRIVING_THRESHOLD_METERS = 150;
const ARRIVED_THRESHOLD_METERS = 50;
const LEFT_THRESHOLD_METERS = 100;

export const processGeofence = async (
  vehicleId: string,
  tripId: string,
  routeId: string,
  lat: number,
  lng: number,
  timestamp: number
): Promise<GeofenceResult[]> => {
  const results: GeofenceResult[] = [];
  const route = await loadRouteCache(routeId);
  if (!route || route.stops.length === 0) return results;

  const stateKey = `${vehicleId}:${tripId}`;
  let state = vehicleStates.get(stateKey);
  if (!state) {
    state = { vehicleId, tripId, lastStopId: null, lastEventType: null, arrivedAt: null };
    vehicleStates.set(stateKey, state);
  }

  const settings = await getTrackingSettings();
  const radius = settings.geofenceRadiusMeters;

  for (const stop of route.stops) {
    const distToStop = getDistanceInMeters(lat, lng, stop.lat, stop.lng);

    const withinRadius = distToStop <= radius;
    const withinArriving = distToStop <= ARRIVING_THRESHOLD_METERS;
    const withinArrived = distToStop <= ARRIVED_THRESHOLD_METERS;

    if (withinArrived && state.lastStopId !== stop.stopId) {
      results.push({
        eventType: "vehicle:arrived",
        vehicleId,
        tripId,
        routeId,
        stopId: stop.stopId,
        sequence: stop.sequence,
        distanceMeters: distToStop,
        timestamp,
        lat,
        lng,
      });
      state.lastStopId = stop.stopId;
      state.lastEventType = "vehicle:arrived";
      state.arrivedAt = timestamp;
    } else if (withinArriving && state.lastEventType !== "vehicle:approaching" && state.lastStopId !== stop.stopId) {
      results.push({
        eventType: "vehicle:approaching",
        vehicleId,
        tripId,
        routeId,
        stopId: stop.stopId,
        sequence: stop.sequence,
        distanceMeters: distToStop,
        timestamp,
        lat,
        lng,
      });
      state.lastEventType = "vehicle:approaching";
    }

    if (state.lastStopId === stop.stopId && state.lastEventType === "vehicle:arrived" && distToStop > LEFT_THRESHOLD_METERS) {
      const dwellTime = state.arrivedAt ? Math.round((timestamp - state.arrivedAt) / 1000) : 0;
      results.push({
        eventType: "vehicle:left",
        vehicleId,
        tripId,
        routeId,
        stopId: stop.stopId,
        sequence: stop.sequence,
        distanceMeters: distToStop,
        timestamp,
        lat,
        lng,
      });
      state.lastStopId = null;
      state.lastEventType = "vehicle:left";
      state.arrivedAt = null;
    }
  }

  return results;
};

export const getVehicleGeofenceState = (vehicleId: string, tripId: string): VehicleGeofenceState | null => {
  return vehicleStates.get(`${vehicleId}:${tripId}`) ?? null;
};

export const clearVehicleGeofenceState = (vehicleId: string, tripId: string): void => {
  vehicleStates.delete(`${vehicleId}:${tripId}`);
};

export interface DepotGeofenceResult {
  eventType: Extract<GeofenceEventType, "depot:arrival" | "depot:departure">;
  vehicleId: string;
  depotId: string;
  depotName: string;
  distanceMeters: number;
  timestamp: number;
  lat: number;
  lng: number;
}

interface VehicleDepotState {
  depotId: string | null;
  arrivedAt: number | null;
}

const vehicleDepotStates = new Map<string, VehicleDepotState>();

/**
 * P2-10 depot arrival/departure — runs independently of stop geofencing
 * (no trip/route required) since a vehicle can arrive at a depot with no
 * active trip. Depot locations come from `getTrackingSettings().depots`,
 * a System Settings stub (see tracking-settings.service.ts) standing in
 * for a real depot data model that Person 1 hasn't built yet.
 */
export const processDepotGeofence = async (
  vehicleId: string,
  lat: number,
  lng: number,
  timestamp: number
): Promise<DepotGeofenceResult[]> => {
  const settings = await getTrackingSettings();
  if (!settings.depots.length) return [];

  const results: DepotGeofenceResult[] = [];
  let state = vehicleDepotStates.get(vehicleId);
  if (!state) {
    state = { depotId: null, arrivedAt: null };
    vehicleDepotStates.set(vehicleId, state);
  }

  for (const depot of settings.depots) {
    const distanceMeters = getDistanceInMeters(lat, lng, depot.lat, depot.lng);
    const withinRadius = distanceMeters <= settings.depotRadiusMeters;

    if (withinRadius && state.depotId !== depot.id) {
      results.push({ eventType: "depot:arrival", vehicleId, depotId: depot.id, depotName: depot.name, distanceMeters, timestamp, lat, lng });
      state.depotId = depot.id;
      state.arrivedAt = timestamp;
    } else if (!withinRadius && state.depotId === depot.id) {
      results.push({ eventType: "depot:departure", vehicleId, depotId: depot.id, depotName: depot.name, distanceMeters, timestamp, lat, lng });
      state.depotId = null;
      state.arrivedAt = null;
    }
  }

  return results;
};

export const getVehicleDepotState = (vehicleId: string): VehicleDepotState | null => vehicleDepotStates.get(vehicleId) ?? null;

export const clearVehicleDepotState = (vehicleId: string): void => {
  vehicleDepotStates.delete(vehicleId);
};
