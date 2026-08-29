import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { TRACKING_ROUTES } from "./tracking.routes";
import type {
  TripHistory,
  UpdateLocationInput,
  VehicleLocation,
} from "./tracking.types";

export const updateLocation = (
  vehicleId: string,
  payload: UpdateLocationInput
): Promise<ApiResponse<VehicleLocation>> =>
  apiClient<VehicleLocation>(TRACKING_ROUTES.updateLocation(vehicleId), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getLocation = (
  vehicleId: string
): Promise<ApiResponse<VehicleLocation>> =>
  apiClient<VehicleLocation>(TRACKING_ROUTES.getLocation(vehicleId));

export const getByRoute = (
  routeId: string
): Promise<ApiResponse<VehicleLocation[]>> =>
  apiClient<VehicleLocation[]>(TRACKING_ROUTES.getByRoute(routeId));

export const getByTrip = (
  tripId: string
): Promise<ApiResponse<VehicleLocation>> =>
  apiClient<VehicleLocation>(TRACKING_ROUTES.getByTrip(tripId));

export const getTripHistory = (
  tripId: string
): Promise<ApiResponse<TripHistory>> =>
  apiClient<TripHistory>(TRACKING_ROUTES.getTripHistory(tripId));
