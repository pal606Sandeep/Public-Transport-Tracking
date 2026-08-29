import * as trackingApi from "./tracking.api";
import type { UpdateLocationInput, VehicleLocation } from "./tracking.types";

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
