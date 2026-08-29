import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { SERVICE_ALERT_ROUTES } from "./serviceAlert.routes";
import type { ServiceAlert, ServiceAlertInput } from "./serviceAlert.types";

export const getAll = (): Promise<ApiResponse<ServiceAlert[]>> =>
  apiClient<ServiceAlert[]>(SERVICE_ALERT_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<ServiceAlert>> =>
  apiClient<ServiceAlert>(SERVICE_ALERT_ROUTES.getById(id));

export const create = (
  payload: ServiceAlertInput
): Promise<ApiResponse<ServiceAlert>> =>
  apiClient<ServiceAlert>(SERVICE_ALERT_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<ServiceAlertInput>
): Promise<ApiResponse<ServiceAlert>> =>
  apiClient<ServiceAlert>(SERVICE_ALERT_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(SERVICE_ALERT_ROUTES.remove(id), { method: "DELETE" });
