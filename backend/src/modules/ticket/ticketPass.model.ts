import mongoose, { Types } from "mongoose";

export type TicketPassStatus = "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED";

export interface ITicketPass {
  user: Types.ObjectId;
  pass: Types.ObjectId;
  passName: string;
  type: string;
  price: number;
  currency: string;
  status: TicketPassStatus;
  purchasedAt: Date;
  validFrom?: Date | null;
  expiresAt?: Date | null;
  durationDays?: number | null;
  unlimited?: boolean | null;
  usedCount: number;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ticketPassSchema = new mongoose.Schema<ITicketPass>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pass: { type: mongoose.Schema.Types.ObjectId, ref: "Pass", required: true },
    passName: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
    },
    purchasedAt: { type: Date, default: Date.now },
    validFrom: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    durationDays: { type: Number, default: null },
    unlimited: { type: Boolean, default: true },
    usedCount: { type: Number, default: 0 },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketPassSchema.index({ user: 1, status: 1 });
ticketPassSchema.index({ user: 1, expiresAt: 1 });

export const TicketPass = mongoose.model<ITicketPass>("TicketPass", ticketPassSchema);
