import mongoose, { Types } from "mongoose";

export interface IGPSHistory {
  timestamp: Date;
  meta: {
    vehicleId: Types.ObjectId;
    tripId: Types.ObjectId;
    driverId: Types.ObjectId;
  };
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  speed: number;
  heading: number;
  accuracy: number;
}

const gpsHistorySchema = new mongoose.Schema<IGPSHistory>(
  {
    timestamp: { type: Date, required: true },
    meta: {
      vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
      tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) => v.length === 2,
          message: "location.coordinates must be [lng, lat]",
        },
      },
    },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "meta",
      granularity: "seconds",
    },
    timestamps: false,
  }
);

gpsHistorySchema.index({ "meta.tripId": 1, timestamp: 1 });
gpsHistorySchema.index({ "meta.vehicleId": 1, timestamp: 1 });
gpsHistorySchema.index({ location: "2dsphere" });

gpsHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const GPSHistory = mongoose.model<IGPSHistory>(
  "GPSHistory",
  gpsHistorySchema,
  "gpsHistory"
);
