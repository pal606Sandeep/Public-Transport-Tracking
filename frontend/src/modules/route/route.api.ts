import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { ROUTE_ROUTES } from "./route.routes";
import type { Route, RouteInput } from "./route.types";

export const getAll = (): Promise<ApiResponse<Route[]>> =>
  apiClient<Route[]>(ROUTE_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Route>> =>
  apiClient<Route>(ROUTE_ROUTES.getById(id));

export const create = (
  payload: RouteInput
): Promise<ApiResponse<Route>> =>
  apiClient<Route>(ROUTE_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<RouteInput>
): Promise<ApiResponse<Route>> =>
  apiClient<Route>(ROUTE_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(ROUTE_ROUTES.remove(id), { method: "DELETE" });
