import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { DRIVER_ROUTES } from "./driver.routes";
import type { Driver, DriverInput } from "./driver.types";

export const getAll = (): Promise<ApiResponse<Driver[]>> =>
  apiClient<Driver[]>(DRIVER_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Driver>> =>
  apiClient<Driver>(DRIVER_ROUTES.getById(id));

export const create = (
  payload: DriverInput
): Promise<ApiResponse<Driver>> =>
  apiClient<Driver>(DRIVER_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<DriverInput>
): Promise<ApiResponse<Driver>> =>
  apiClient<Driver>(DRIVER_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(DRIVER_ROUTES.remove(id), { method: "DELETE" });
