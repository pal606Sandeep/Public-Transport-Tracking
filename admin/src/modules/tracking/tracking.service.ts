import * as trackingApi from "./tracking.api";
import type {
  TripHistory,
  UpdateLocationInput,
  VehicleLocation,
} from "./tracking.types";

export const updateVehicleLocation = async (
  vehicleId: string,
  payload: UpdateLocationInput
): Promise<VehicleLocation | null> => {
  const res = await trackingApi.updateLocation(vehicleId, payload);
  return res.data ?? null;
};

export const getVehicleLocation = async (
  vehicleId: string
): Promise<VehicleLocation | null> => {
  const res = await trackingApi.getLocation(vehicleId);
  return res.data ?? null;
};

export const getRouteVehicles = async (
  routeId: string
): Promise<VehicleLocation[]> => {
  const res = await trackingApi.getByRoute(routeId);
  return res.data ?? [];
};

export const getTripVehicle = async (
  tripId: string
): Promise<VehicleLocation | null> => {
  const res = await trackingApi.getByTrip(tripId);
  return res.data ?? null;
};

export const getTripHistory = async (
  tripId: string
): Promise<TripHistory | null> => {
  const res = await trackingApi.getTripHistory(tripId);
  return res.data ?? null;
};
