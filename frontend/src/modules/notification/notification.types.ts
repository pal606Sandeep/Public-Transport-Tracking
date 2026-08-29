export interface Notification {
  _id: string;
  user: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationInput {
  user: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read?: boolean;
}
