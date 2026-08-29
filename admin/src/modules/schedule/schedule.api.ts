import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { SCHEDULE_ROUTES } from "./schedule.routes";
import type { Schedule, ScheduleInput } from "./schedule.types";

export const getAll = (): Promise<ApiResponse<Schedule[]>> =>
  apiClient<Schedule[]>(SCHEDULE_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Schedule>> =>
  apiClient<Schedule>(SCHEDULE_ROUTES.getById(id));

export const create = (
  payload: ScheduleInput
): Promise<ApiResponse<Schedule>> =>
  apiClient<Schedule>(SCHEDULE_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<ScheduleInput>
): Promise<ApiResponse<Schedule>> =>
  apiClient<Schedule>(SCHEDULE_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(SCHEDULE_ROUTES.remove(id), { method: "DELETE" });
