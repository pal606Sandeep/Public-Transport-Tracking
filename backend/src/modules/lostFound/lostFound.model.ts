import mongoose, { Types } from "mongoose";

export type LostFoundKind = "LOST" | "FOUND";
export type LostFoundStatus = "OPEN" | "MATCHED" | "CLAIMED" | "RETURNED" | "CLOSED";

export interface ILostFoundItem {
  kind: LostFoundKind;
  reportedBy?: Types.ObjectId | null;
  reporterName?: string | null;
  reporterContact?: string | null;
  title: string;
  description: string;
  category?: string | null;
  color?: string | null;
  route?: Types.ObjectId | null;
  vehicle?: Types.ObjectId | null;
  trip?: Types.ObjectId | null;
  occurredAt: Date;
  attachments: { key: string; addedAt: Date }[];
  status: LostFoundStatus;
  assignedTo?: Types.ObjectId | null;
  matchedWith?: Types.ObjectId | null;
  resolution?: {
    returnedTo?: string | null;
    confirmedBy?: Types.ObjectId | null;
    confirmedAt: Date;
    note?: string | null;
  } | null;
  history: { action: string; by?: Types.ObjectId | null; at: Date; note?: string | null }[];
}

const lostFoundSchema = new mongoose.Schema<ILostFoundItem>(
  {
    kind: { type: String, enum: ["LOST", "FOUND"], required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reporterName: { type: String, default: null },
    reporterContact: { type: String, default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, default: null },
    color: { type: String, default: null },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    occurredAt: { type: Date, required: true },
    attachments: {
      type: [{ key: { type: String, required: true }, addedAt: { type: Date, default: Date.now } }],
      default: [],
    },
    status: {
      type: String,
      enum: ["OPEN", "MATCHED", "CLAIMED", "RETURNED", "CLOSED"],
      default: "OPEN",
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: "LostFoundItem", default: null },
    resolution: {
      type: {
        returnedTo: { type: String, default: null },
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        confirmedAt: { type: Date },
        note: { type: String, default: null },
      },
      default: null,
    },
    history: {
      type: [
        {
          action: { type: String, required: true },
          by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          at: { type: Date, default: Date.now },
          note: { type: String, default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

lostFoundSchema.index({ kind: 1, status: 1, occurredAt: -1 });
lostFoundSchema.index({ route: 1, occurredAt: -1 });
lostFoundSchema.index({ reportedBy: 1, createdAt: -1 });

export const LostFoundItem = mongoose.model<ILostFoundItem>("LostFoundItem", lostFoundSchema);
