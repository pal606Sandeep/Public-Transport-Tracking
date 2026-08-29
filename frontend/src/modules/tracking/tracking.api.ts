import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { TRACKING_ROUTES } from "./tracking.routes";
import type { UpdateLocationInput, VehicleLocation } from "./tracking.types";

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
