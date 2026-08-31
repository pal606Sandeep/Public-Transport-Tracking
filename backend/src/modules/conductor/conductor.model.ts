import mongoose, { Types } from "mongoose";

export interface IConductor {
  user: Types.ObjectId;
  name: string;
  phone?: string | null;
  employeeId: string;
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
  ticketSales: number;
  revenueCollected: number;
  deletedAt?: Date | null;
}

const conductorSchema = new mongoose.Schema<IConductor>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    employeeId: { type: String, required: true, trim: true },
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
    ticketSales: { type: Number, default: 0 },
    revenueCollected: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

conductorSchema.index({ user: 1 }, { unique: true });
conductorSchema.index({ employeeId: 1 }, { unique: true });
conductorSchema.index({ status: 1 });

export const Conductor = mongoose.model<IConductor>("Conductor", conductorSchema);
