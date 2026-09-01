import mongoose, { Types } from "mongoose";

export type OccupancyLevel = "LOW" | "MODERATE" | "CROWDED";

export interface IOccupancyReading {
  trip: Types.ObjectId;
  vehicle: Types.ObjectId;
  route: Types.ObjectId;
  level: OccupancyLevel;
  passengerCount: number;
  capacity: number;
  occupancyPercentage: number;
  eventTraceId?: string;
  occurredAt: Date;
  createdAt?: Date;
}

/**
 * P1-47 — crowding history per trip/route. Consumed from Person 2's
 * `OCCUPANCY_CHANGED` events (P2-22 → P2-23 bus) and used by the analytics
 * query to report crowding distribution over a window.
 */
const occupancyReadingSchema = new mongoose.Schema<IOccupancyReading>(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    level: { type: String, enum: ["LOW", "MODERATE", "CROWDED"], required: true },
    passengerCount: { type: Number, default: 0 },
    capacity: { type: Number, default: 0 },
    occupancyPercentage: { type: Number, default: 0 },
    eventTraceId: { type: String, default: null },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

occupancyReadingSchema.index({ trip: 1, occurredAt: 1 });
occupancyReadingSchema.index({ route: 1, occurredAt: 1 });
occupancyReadingSchema.index({ vehicle: 1, occurredAt: 1 });
// Dedup on event traceId (at-least-once redelivery backstop).
occupancyReadingSchema.index({ eventTraceId: 1 }, { unique: true, sparse: true });

export const OccupancyReading = mongoose.model<IOccupancyReading>(
  "OccupancyReading",
  occupancyReadingSchema
);
