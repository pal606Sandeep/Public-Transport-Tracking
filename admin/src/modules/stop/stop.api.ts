import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { STOP_ROUTES } from "./stop.routes";
import type { Stop, StopInput } from "./stop.types";

export const getAll = (): Promise<ApiResponse<Stop[]>> =>
  apiClient<Stop[]>(STOP_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Stop>> =>
  apiClient<Stop>(STOP_ROUTES.getById(id));

export const create = (
  payload: StopInput
): Promise<ApiResponse<Stop>> =>
  apiClient<Stop>(STOP_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<StopInput>
): Promise<ApiResponse<Stop>> =>
  apiClient<Stop>(STOP_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(STOP_ROUTES.remove(id), { method: "DELETE" });
