import mongoose, { Types } from "mongoose";

export type NotificationChannel = "inApp" | "webpush" | "sms" | "email";
export type NotificationStatus = "sent" | "deferred" | "failed";

export interface INotification {
  user: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  channels: NotificationChannel[];
  status: NotificationStatus;
  read: boolean;
  readAt?: Date | null;
  deferredUntil?: Date | null;
  dedupeKey?: string | null;
}

const notificationSchema = new mongoose.Schema<INotification>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: null },
    channels: { type: [String], default: ["inApp"] },
    status: { type: String, enum: ["sent", "deferred", "failed"], default: "sent" },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    deferredUntil: { type: Date, default: null },
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
// Dedup guard for fan-out: same logical event to the same user only once.
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }
);

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
