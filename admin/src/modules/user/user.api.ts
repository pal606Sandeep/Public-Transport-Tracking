import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { USER_ROUTES } from "./user.routes";
import type { User, UserInput } from "./user.types";

export const getAll = (): Promise<ApiResponse<User[]>> =>
  apiClient<User[]>(USER_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<User>> =>
  apiClient<User>(USER_ROUTES.getById(id));

export const create = (
  payload: UserInput
): Promise<ApiResponse<User>> =>
  apiClient<User>(USER_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<UserInput>
): Promise<ApiResponse<User>> =>
  apiClient<User>(USER_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(USER_ROUTES.remove(id), { method: "DELETE" });
