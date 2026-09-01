import mongoose, { Types } from "mongoose";

export type PassType = "DAILY" | "WEEKLY" | "MONTHLY" | "STUDENT" | "SENIOR";

export interface IPass {
  name: string;
  type: PassType;
  price: number;
  currency: string;
  durationDays?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  isActive: boolean;
  unlimited?: boolean | null;
  deletedAt?: Date | null;
}

const passSchema = new mongoose.Schema<IPass>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY", "STUDENT", "SENIOR"], required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    durationDays: { type: Number, default: null },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    unlimited: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passSchema.index({ type: 1, isActive: 1 });

export const Pass = mongoose.model<IPass>("Pass", passSchema);
