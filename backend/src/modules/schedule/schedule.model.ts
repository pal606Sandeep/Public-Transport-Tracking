import mongoose, { Types } from "mongoose";

export interface ISchedule {
  name: string;
  code?: string | null;
  route: Types.ObjectId;
  vehicle?: Types.ObjectId | null;
  driver?: Types.ObjectId | null;
  conductor?: Types.ObjectId | null;
  frequencyType: "DAILY" | "WEEKLY" | "WEEKEND" | "HOLIDAY" | "SPECIAL";
  daysOfWeek: number[];
  departureTimes: string[];
  durationMin: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  deletedAt?: Date | null;
}

const scheduleSchema = new mongoose.Schema<ISchedule>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    conductor: { type: mongoose.Schema.Types.ObjectId, ref: "Conductor", default: null },
    frequencyType: {
      type: String,
      enum: ["DAILY", "WEEKLY", "WEEKEND", "HOLIDAY", "SPECIAL"],
      default: "DAILY",
    },
    daysOfWeek: { type: [Number], default: [] },
    departureTimes: { type: [String], default: [] },
    durationMin: { type: Number, default: 60 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

scheduleSchema.index({ route: 1 });
scheduleSchema.index({ code: 1 });
scheduleSchema.index({ isActive: 1 });

export const Schedule = mongoose.model<ISchedule>("Schedule", scheduleSchema);
