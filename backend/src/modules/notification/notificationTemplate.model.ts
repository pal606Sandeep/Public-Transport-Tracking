import mongoose from "mongoose";

export interface INotificationTemplate {
  key: string;
  description?: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  enabled: boolean;
}

const notificationTemplateSchema = new mongoose.Schema<INotificationTemplate>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: null },
    titleTemplate: { type: String, required: true },
    bodyTemplate: { type: String, required: true },
    variables: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const NotificationTemplate = mongoose.model<INotificationTemplate>(
  "NotificationTemplate",
  notificationTemplateSchema
);
