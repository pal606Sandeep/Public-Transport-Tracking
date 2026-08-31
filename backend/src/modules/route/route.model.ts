import mongoose, { Types } from "mongoose";

export interface IStopEntry {
  stopId: Types.ObjectId;
  sequence: number;
  scheduledOffsetMinutes: number;
}

export interface IRoute {
  routeNumber: string;
  name?: string | null;
  source?: Types.ObjectId | null;
  destination?: Types.ObjectId | null;
  distanceKm?: number | null;
  estimatedDurationMin?: number | null;
  geometry?: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
  direction?: string | null;
  status: "ACTIVE" | "INACTIVE";
  orderedStops: IStopEntry[];
  stops: Types.ObjectId[];
  deletedAt?: Date | null;
}

const stopEntrySchema = new mongoose.Schema<IStopEntry>(
  {
    stopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", required: true },
    sequence: { type: Number, required: true },
    scheduledOffsetMinutes: { type: Number, default: 0 },
  },
  { _id: false, versionKey: false }
);

const routeSchema = new mongoose.Schema<IRoute>(
  {
    routeNumber: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: null },
    source: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    distanceKm: { type: Number, default: null },
    estimatedDurationMin: { type: Number, default: null },
    geometry: {
      type: {
        type: String,
        enum: ["LineString"],
        default: "LineString",
      },
      coordinates: { type: [[Number]], default: [] },
    },
    direction: { type: String, default: null },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    orderedStops: [stopEntrySchema],
    stops: { type: [mongoose.Schema.Types.ObjectId], ref: "Stop", default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

routeSchema.index({ status: 1 });
routeSchema.index({ stops: 1 });
routeSchema.index({ geometry: "2dsphere" });

export const Route = mongoose.model<IRoute>("Route", routeSchema);
