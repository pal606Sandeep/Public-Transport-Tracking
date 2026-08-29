import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { TRIP_ROUTES } from "./trip.routes";
import type { Trip, TripInput, TripSummary } from "./trip.types";

export const getAll = (): Promise<ApiResponse<Trip[]>> =>
  apiClient<Trip[]>(TRIP_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Trip>> =>
  apiClient<Trip>(TRIP_ROUTES.getById(id));

export const create = (payload: TripInput): Promise<ApiResponse<Trip>> =>
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

export const cancel = (id: string): Promise<ApiResponse<Trip>> =>
  apiClient<Trip>(TRIP_ROUTES.cancel(id), { method: "POST" });

export const forceEnd = (id: string): Promise<ApiResponse<Trip>> =>
  apiClient<Trip>(TRIP_ROUTES.forceEnd(id), { method: "POST" });

export const getSummary = (id: string): Promise<ApiResponse<TripSummary>> =>
  apiClient<TripSummary>(TRIP_ROUTES.summary(id));
