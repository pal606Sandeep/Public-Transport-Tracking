import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    routeNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    startStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
    },
    endStop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
    },
    stops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stop",
      },
    ],
    distanceKm: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Route = mongoose.model("Route", routeSchema);