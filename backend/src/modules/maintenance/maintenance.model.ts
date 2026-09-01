import mongoose, { Types } from "mongoose";

export type MaintenanceType = "SERVICE" | "REPAIR" | "TYRE" | "OIL" | "INSPECTION";
export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface IMaintenanceRecord {
  vehicle: Types.ObjectId;
  type: MaintenanceType;
  title: string;
  description?: string | null;
  status: MaintenanceStatus;
  scheduledDate?: Date | null;
  completedAt?: Date | null;
  cost?: number | null;
  odometerKm?: number | null;
  provider?: string | null;
  parts?: { name: string; quantity: number; cost: number }[];
  notes?: { at: Date; by?: string | null; text: string }[];
  deletedAt?: Date | null;
}

const maintenanceSchema = new mongoose.Schema<IMaintenanceRecord>(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    type: { type: String, enum: ["SERVICE", "REPAIR", "TYRE", "OIL", "INSPECTION"], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
    scheduledDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cost: { type: Number, default: null },
    odometerKm: { type: Number, default: null },
    provider: { type: String, default: null },
    parts: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        cost: { type: Number, default: 0 },
      },
    ],
    notes: [
      {
        at: { type: Date, default: Date.now },
        by: { type: String, default: null },
        text: { type: String, required: true },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

maintenanceSchema.index({ vehicle: 1, scheduledDate: 1 });
maintenanceSchema.index({ status: 1 });

export const MaintenanceRecord = mongoose.model<IMaintenanceRecord>("MaintenanceRecord", maintenanceSchema);
