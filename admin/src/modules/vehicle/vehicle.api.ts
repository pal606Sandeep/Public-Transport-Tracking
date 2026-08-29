import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { VEHICLE_ROUTES } from "./vehicle.routes";
import type { Vehicle, VehicleInput } from "./vehicle.types";

export const getAll = (): Promise<ApiResponse<Vehicle[]>> =>
  apiClient<Vehicle[]>(VEHICLE_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Vehicle>> =>
  apiClient<Vehicle>(VEHICLE_ROUTES.getById(id));

export const create = (
  payload: VehicleInput
): Promise<ApiResponse<Vehicle>> =>
  apiClient<Vehicle>(VEHICLE_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<VehicleInput>
): Promise<ApiResponse<Vehicle>> =>
  apiClient<Vehicle>(VEHICLE_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(VEHICLE_ROUTES.remove(id), { method: "DELETE" });
