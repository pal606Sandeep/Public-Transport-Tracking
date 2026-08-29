import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { CONDUCTOR_ROUTES } from "./conductor.routes";
import type { Conductor, ConductorInput } from "./conductor.types";

export const getAll = (): Promise<ApiResponse<Conductor[]>> =>
  apiClient<Conductor[]>(CONDUCTOR_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Conductor>> =>
  apiClient<Conductor>(CONDUCTOR_ROUTES.getById(id));

export const create = (
  payload: ConductorInput
): Promise<ApiResponse<Conductor>> =>
  apiClient<Conductor>(CONDUCTOR_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<ConductorInput>
): Promise<ApiResponse<Conductor>> =>
  apiClient<Conductor>(CONDUCTOR_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(CONDUCTOR_ROUTES.remove(id), { method: "DELETE" });
