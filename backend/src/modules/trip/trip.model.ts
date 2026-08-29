import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
    },
    status: {
      type: String,
      default: "SCHEDULED",
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    currentStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
    },
  },
  { timestamps: true }
);

export const Trip = mongoose.model("Trip", tripSchema);