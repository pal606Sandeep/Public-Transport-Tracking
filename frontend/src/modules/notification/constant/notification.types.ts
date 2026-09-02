export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channels: string[];
  status: string;
  read: boolean;
  readAt: string | null;
  deferredUntil: string | null;
  createdAt: string;
}

export interface NotificationList {
  notifications: AppNotification[];
  unread: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface NotificationPreferences {
  channels: { inApp: boolean; webpush: boolean; sms: boolean; email: boolean };
  quietHours: { start: string | null; end: string | null };
  digest: boolean;
  mutedTypes: string[];
}

export type PreferencesPatch = {
  channels?: Partial<NotificationPreferences["channels"]>;
  quietHours?: { start: string | null; end: string | null };
  digest?: boolean;
  mutedTypes?: string[];
};

/** Browser PushSubscription.toJSON() shape the backend expects. */
export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}
