import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { TRIP_ROUTES } from "./trip.routes";
import type { Trip, TripInput } from "./trip.types";

export const getAll = (): Promise<ApiResponse<Trip[]>> =>
  apiClient<Trip[]>(TRIP_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Trip>> =>
  apiClient<Trip>(TRIP_ROUTES.getById(id));

export const create = (
  payload: TripInput
): Promise<ApiResponse<Trip>> =>
  apiClient<Trip>(TRIP_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<TripInput>
): Promise<ApiResponse<Trip>> =>
  apiClient<Trip>(TRIP_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(TRIP_ROUTES.remove(id), { method: "DELETE" });
