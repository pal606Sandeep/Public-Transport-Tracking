import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { FARE_ROUTES } from "./fare.routes";
import type { Fare, FareInput } from "./fare.types";

export const getAll = (): Promise<ApiResponse<Fare[]>> =>
  apiClient<Fare[]>(FARE_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Fare>> =>
  apiClient<Fare>(FARE_ROUTES.getById(id));

export const create = (
  payload: FareInput
): Promise<ApiResponse<Fare>> =>
  apiClient<Fare>(FARE_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<FareInput>
): Promise<ApiResponse<Fare>> =>
  apiClient<Fare>(FARE_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(FARE_ROUTES.remove(id), { method: "DELETE" });
