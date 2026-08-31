import mongoose, { Types } from "mongoose";

export interface IVehicle {
  registrationNumber: string;
  model?: string | null;
  type: string;
  capacity: number;
  fuelType?: string | null;
  gpsDeviceId?: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED";
  assignedDriver?: Types.ObjectId | null;
  assignedConductor?: Types.ObjectId | null;
  assignedRoute?: Types.ObjectId | null;
  wheelchairAccessible: boolean;
  amenities?: Record<string, unknown> | null;
  history?: {
    at: Date;
    status: string;
    note?: string | null;
  }[];
  deletedAt?: Date | null;
}

const vehicleSchema = new mongoose.Schema<IVehicle>(
  {
    registrationNumber: { type: String, required: true, unique: true, trim: true },
    model: { type: String, default: null },
    type: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    fuelType: { type: String, default: null },
    gpsDeviceId: { type: String, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"],
      default: "ACTIVE",
    },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    assignedConductor: { type: mongoose.Schema.Types.ObjectId, ref: "Conductor", default: null },
    assignedRoute: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    wheelchairAccessible: { type: Boolean, default: false },
    amenities: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: [
      {
        _id: false,
        at: { type: Date, default: Date.now },
        status: { type: String, required: true },
        note: { type: String, default: null },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1 });
vehicleSchema.index({ gpsDeviceId: 1 });

export const Vehicle = mongoose.model<IVehicle>("Vehicle", vehicleSchema);
