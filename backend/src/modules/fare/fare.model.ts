import mongoose, { Types } from "mongoose";

export type FareType = "ROUTE" | "DISTANCE" | "STAGE";

export interface IFare {
  name: string;
  type: FareType;
  isActive: boolean;
  route?: Types.ObjectId | null;
  fromStop?: Types.ObjectId | null;
  toStop?: Types.ObjectId | null;
  amount: number;
  distanceFromKm?: number | null;
  distanceToKm?: number | null;
  priority: number;
  deletedAt?: Date | null;
}

const fareSchema = new mongoose.Schema<IFare>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["ROUTE", "DISTANCE", "STAGE"], required: true },
    isActive: { type: Boolean, default: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    fromStop: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    toStop: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    amount: { type: Number, required: true, min: 0 },
    distanceFromKm: { type: Number, default: null },
    distanceToKm: { type: Number, default: null },
    priority: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

fareSchema.index({ type: 1, isActive: 1 });
fareSchema.index({ route: 1 });

export const Fare = mongoose.model<IFare>("Fare", fareSchema);
