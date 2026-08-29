import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { MAINTENANCE_ROUTES } from "./maintenance.routes";
import type { MaintenanceRecord, MaintenanceRecordInput } from "./maintenance.types";

export const getAll = (): Promise<ApiResponse<MaintenanceRecord[]>> =>
  apiClient<MaintenanceRecord[]>(MAINTENANCE_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<MaintenanceRecord>> =>
  apiClient<MaintenanceRecord>(MAINTENANCE_ROUTES.getById(id));

export const create = (
  payload: MaintenanceRecordInput
): Promise<ApiResponse<MaintenanceRecord>> =>
  apiClient<MaintenanceRecord>(MAINTENANCE_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<MaintenanceRecordInput>
): Promise<ApiResponse<MaintenanceRecord>> =>
  apiClient<MaintenanceRecord>(MAINTENANCE_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(MAINTENANCE_ROUTES.remove(id), { method: "DELETE" });
