import * as vehicleApi from "./vehicle.api";
import type { Vehicle, VehicleInput } from "./vehicle.types";

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  const res = await vehicleApi.getAll();
  return res.data ?? [];
};

export const getVehicleById = async (
  id: string
): Promise<Vehicle | null> => {
  const res = await vehicleApi.getById(id);
  return res.data ?? null;
};

export const createVehicle = async (
  payload: VehicleInput
): Promise<Vehicle | null> => {
  const res = await vehicleApi.create(payload);
  return res.data ?? null;
};

export const updateVehicle = async (
  id: string,
  payload: Partial<VehicleInput>
): Promise<Vehicle | null> => {
  const res = await vehicleApi.update(id, payload);
  return res.data ?? null;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
  const res = await vehicleApi.remove(id);
  return res.success;
};
