import mongoose, { Types } from "mongoose";

export interface IDriver {
  user: Types.ObjectId;
  name: string;
  phone?: string | null;
  employeeId: string;
  licenseNumber: string;
  licenseType?: string | null;
  licenseExpiry?: Date | null;
  joiningDate?: Date | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED";
  shift: {
    type: "MORNING" | "EVENING" | "NIGHT" | "SPLIT";
    start?: string | null;
    end?: string | null;
  };
  assigned: {
    vehicleId?: Types.ObjectId | null;
    routeId?: Types.ObjectId | null;
    scheduleId?: Types.ObjectId | null;
  };
  attendance: {
    date: Date;
    checkIn?: Date | null;
    checkOut?: Date | null;
  }[];
  complaintsCount: number;
  performance?: Record<string, unknown> | null;
  deletedAt?: Date | null;
}

const driverSchema = new mongoose.Schema<IDriver>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    employeeId: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseType: { type: String, default: null },
    licenseExpiry: { type: Date, default: null },
    joiningDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ON_LEAVE", "SUSPENDED"],
      default: "ACTIVE",
    },
    shift: {
      type: { type: String, enum: ["MORNING", "EVENING", "NIGHT", "SPLIT"], default: "MORNING" },
      start: { type: String, default: null },
      end: { type: String, default: null },
    },
    assigned: {
      vehicleId: { type: mongoose.Schema.Types.ObjectId, default: null },
      routeId: { type: mongoose.Schema.Types.ObjectId, default: null },
      scheduleId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    attendance: [
      {
        _id: false,
        date: { type: Date, required: true },
        checkIn: { type: Date, default: null },
        checkOut: { type: Date, default: null },
      },
    ],
    complaintsCount: { type: Number, default: 0 },
    performance: { type: mongoose.Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

driverSchema.index({ user: 1 }, { unique: true });
driverSchema.index({ employeeId: 1 }, { unique: true });
driverSchema.index({ status: 1 });
driverSchema.index({ licenseExpiry: 1 });

export const Driver = mongoose.model<IDriver>("Driver", driverSchema);
