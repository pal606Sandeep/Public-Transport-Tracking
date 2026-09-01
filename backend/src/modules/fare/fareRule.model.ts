import mongoose, { Types } from "mongoose";

export interface IFareRule {
  name: string;
  description?: string | null;
  baseFare: number;
  perStopFare: number;
  perKmFare?: number | null;
  minimumFare?: number | null;
  currency: string;
  acceptedPaymentMethods?: string[];
  isActive: boolean;
  deletedAt?: Date | null;
}

const fareRuleSchema = new mongoose.Schema<IFareRule>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    baseFare: { type: Number, required: true, min: 0 },
    perStopFare: { type: Number, required: true, min: 0 },
    perKmFare: { type: Number, default: null },
    minimumFare: { type: Number, default: null },
    currency: { type: String, default: "INR", trim: true },
    acceptedPaymentMethods: { type: [String], default: ["QR", "CASH", "CARD", "UPI"] },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

fareRuleSchema.index({ isActive: 1 });

export const FareRule = mongoose.model<IFareRule>("FareRule", fareRuleSchema);
