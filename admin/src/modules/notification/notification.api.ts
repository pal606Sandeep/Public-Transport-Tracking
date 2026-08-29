import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { NOTIFICATION_ROUTES } from "./notification.routes";
import type { Notification, NotificationInput } from "./notification.types";

export const getAll = (): Promise<ApiResponse<Notification[]>> =>
  apiClient<Notification[]>(NOTIFICATION_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Notification>> =>
  apiClient<Notification>(NOTIFICATION_ROUTES.getById(id));

export const create = (
  payload: NotificationInput
): Promise<ApiResponse<Notification>> =>
  apiClient<Notification>(NOTIFICATION_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<NotificationInput>
): Promise<ApiResponse<Notification>> =>
  apiClient<Notification>(NOTIFICATION_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(NOTIFICATION_ROUTES.remove(id), { method: "DELETE" });
