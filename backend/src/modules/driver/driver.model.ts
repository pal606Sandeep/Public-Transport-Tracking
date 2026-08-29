import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "OFFLINE",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
  },
  { timestamps: true }
);

export const Driver = mongoose.model("Driver", driverSchema);