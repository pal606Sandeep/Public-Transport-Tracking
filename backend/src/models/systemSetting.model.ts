import mongoose from "mongoose";

/**
 * Key/value system settings (surfaced to the frontend only via GET /config —
 * never hard-coded client-side). One document per `key`.
 */
const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model(
  "SystemSetting",
  systemSettingSchema
);
