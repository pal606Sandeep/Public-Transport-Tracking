import mongoose, { Types } from "mongoose";

export type TripStatus =
  | "SCHEDULED"
  | "ASSIGNED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "MISSED";

export interface ITrip {
  schedule?: Types.ObjectId | null;
  route: Types.ObjectId;
  vehicle?: Types.ObjectId | null;
  driver?: Types.ObjectId | null;
  conductor?: Types.ObjectId | null;
  status: TripStatus;
  scheduledStartAt?: Date | null;
  scheduledEndAt?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  currentStop?: Types.ObjectId | null;
  lastKnownPosition?: {
    type: "Point";
    coordinates: [number, number];
    at?: Date | null;
  } | null;
  summary?: Record<string, unknown> | null;
  cancelReason?: string | null;
  cancelledAt?: Date | null;
  checklist?: Record<string, unknown> | null;
  passengerSummary?: {
    onBoard: number;
    boarded: number;
    alighted: number;
    perStop: { stop?: Types.ObjectId | null; boarded: number; alighted: number; onBoard: number }[];
    updatedAt?: Date | null;
  } | null;
  reconciliation?: Record<string, unknown> | null;
}

const tripSchema = new mongoose.Schema<ITrip>(
  {
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", default: null },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    conductor: { type: mongoose.Schema.Types.ObjectId, ref: "Conductor", default: null },
    status: {
      type: String,
      enum: ["SCHEDULED", "ASSIGNED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED", "MISSED"],
      default: "SCHEDULED",
    },
    scheduledStartAt: { type: Date, default: null },
    scheduledEndAt: { type: Date, default: null },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    currentStop: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    lastKnownPosition: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], default: [0, 0] },
      at: { type: Date, default: null },
    },
    summary: { type: mongoose.Schema.Types.Mixed, default: null },
    cancelReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    checklist: { type: mongoose.Schema.Types.Mixed, default: null },
    passengerSummary: {
      type: new mongoose.Schema(
        {
          onBoard: { type: Number, default: 0 },
          boarded: { type: Number, default: 0 },
          alighted: { type: Number, default: 0 },
          perStop: [
            {
              _id: false,
              stop: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
              boarded: { type: Number, default: 0 },
              alighted: { type: Number, default: 0 },
              onBoard: { type: Number, default: 0 },
            },
          ],
          updatedAt: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    reconciliation: {
      type: new mongoose.Schema(
        {
          expected: { type: Number, default: 0 },
          collected: { type: Number, default: 0 },
          variance: { type: Number, default: 0 },
          ticketsIssued: { type: Number, default: 0 },
          cashCollected: { type: Number, default: 0 },
          digitalCollected: { type: Number, default: 0 },
          reconciledAt: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps: true }
);

tripSchema.index({ route: 1, status: 1 });
tripSchema.index({ schedule: 1, scheduledStartAt: 1 });
tripSchema.index({ driver: 1, status: 1 });
tripSchema.index({ scheduledStartAt: 1 });

export const Trip = mongoose.model<ITrip>("Trip", tripSchema);
