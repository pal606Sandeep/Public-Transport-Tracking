import { api } from "@/utils/apiClient";
import type {
  AppNotification,
  NotificationList,
  NotificationPreferences,
  PreferencesPatch,
  PushSubscriptionJson,
} from "../constant/notification.types";

const BASE = "/notifications";

export const listNotifications = async (params: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationList> => {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 30));
  if (params.unreadOnly) p.set("unreadOnly", "true");
  const res = await api.get<NotificationList>(`${BASE}?${p.toString()}`);
  return (
    res.data ?? {
      notifications: [],
      unread: 0,
      pagination: { page: 1, limit: 30, total: 0, totalPages: 1 },
    }
  );
};

export const markRead = async (
  id: string,
  read = true
): Promise<AppNotification> => {
  const res = await api.patch<{ notification: AppNotification }>(
    `${BASE}/${id}/read`,
    { read }
  );
  return (res.data as { notification: AppNotification }).notification;
};

export const markAllRead = async (): Promise<{ updated: number }> => {
  const res = await api.post<{ updated: number }>(`${BASE}/read-all`);
  return res.data ?? { updated: 0 };
};

export const getPreferences = async (): Promise<NotificationPreferences> => {
  const res = await api.get<{ preferences: NotificationPreferences }>(
    `${BASE}/preferences`
  );
  return (res.data as { preferences: NotificationPreferences }).preferences;
};

export const updatePreferences = async (
  patch: PreferencesPatch
): Promise<NotificationPreferences> => {
  const res = await api.put<{ preferences: NotificationPreferences }>(
    `${BASE}/preferences`,
    patch
  );
  return (res.data as { preferences: NotificationPreferences }).preferences;
};

export const registerPush = (sub: PushSubscriptionJson): Promise<unknown> =>
  api.post(`${BASE}/push-subscriptions`, sub);

export const removePush = (endpoint: string): Promise<unknown> =>
  api.del(`${BASE}/push-subscriptions`, { body: { endpoint } });
