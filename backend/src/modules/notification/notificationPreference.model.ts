import mongoose, { Types } from "mongoose";

export interface INotificationPreference {
  user: Types.ObjectId;
  channels: { inApp: boolean; webpush: boolean; sms: boolean; email: boolean };
  quietHours: { start: string | null; end: string | null }; // "HH:MM" 24h, local/UTC
  digest: boolean;
  mutedTypes: string[];
}

const notificationPreferenceSchema = new mongoose.Schema<INotificationPreference>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    channels: {
      inApp: { type: Boolean, default: true },
      webpush: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: true },
    },
    quietHours: {
      start: { type: String, default: null },
      end: { type: String, default: null },
    },
    digest: { type: Boolean, default: false },
    mutedTypes: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const NotificationPreference = mongoose.model<INotificationPreference>(
  "NotificationPreference",
  notificationPreferenceSchema
);
