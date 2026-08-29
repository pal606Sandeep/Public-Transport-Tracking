import * as notificationApi from "./notification.api";
import type { Notification, NotificationInput } from "./notification.types";

export const getAllNotifications = async (): Promise<Notification[]> => {
  const res = await notificationApi.getAll();
  return res.data ?? [];
};

export const getNotificationById = async (
  id: string
): Promise<Notification | null> => {
  const res = await notificationApi.getById(id);
  return res.data ?? null;
};

export const createNotification = async (
  payload: NotificationInput
): Promise<Notification | null> => {
  const res = await notificationApi.create(payload);
  return res.data ?? null;
};

export const updateNotification = async (
  id: string,
  payload: Partial<NotificationInput>
): Promise<Notification | null> => {
  const res = await notificationApi.update(id, payload);
  return res.data ?? null;
};

export const deleteNotification = async (id: string): Promise<boolean> => {
  const res = await notificationApi.remove(id);
  return res.success;
};
