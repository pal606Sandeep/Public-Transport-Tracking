import mongoose, { Types } from "mongoose";

export type ConcessionType = "STUDENT" | "SENIOR" | "DISABLED" | "VETERAN" | "LOW_INCOME" | "GENERAL";

export interface IConcession {
  name: string;
  code: string;
  type: ConcessionType;
  discountPercent: number;
  isActive: boolean;
  validFrom?: Date | null;
  validTo?: Date | null;
  maxPerDay?: number | null;
  deletedAt?: Date | null;
}

const concessionSchema = new mongoose.Schema<IConcession>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["STUDENT", "SENIOR", "DISABLED", "VETERAN", "LOW_INCOME", "GENERAL"],
      required: true,
    },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date, default: null },
    validTo: { type: Date, default: null },
    maxPerDay: { type: Number, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

concessionSchema.index({ code: 1 }, { unique: true });
concessionSchema.index({ type: 1, isActive: 1 });

export const Concession = mongoose.model<IConcession>("Concession", concessionSchema);
