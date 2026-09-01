import mongoose, { Types } from "mongoose";

export const COMPLAINT_CATEGORIES = [
  "bus_delay",
  "driver_behavior",
  "conductor_behavior",
  "vehicle_condition",
  "cleanliness",
  "overcrowding",
  "route_issue",
  "fare_issue",
  "safety",
  "other",
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" | "CLOSED";
export type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface IComplaintHistoryEntry {
  action: string;
  by?: Types.ObjectId | null;
  at: Date;
  note?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface IComplaint {
  complainant: Types.ObjectId;
  category: ComplaintCategory;
  subject: string;
  description: string;
  relatedTrip?: Types.ObjectId | null;
  relatedRoute?: Types.ObjectId | null;
  relatedVehicle?: Types.ObjectId | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo?: Types.ObjectId | null;
  escalationLevel: number;
  attachments: { key: string; addedAt: Date }[];
  resolution?: { note: string; resolvedBy?: Types.ObjectId | null; resolvedAt: Date } | null;
  feedback?: { rating: number; comment?: string | null; submittedAt: Date } | null;
  history: IComplaintHistoryEntry[];
}

const complaintSchema = new mongoose.Schema<IComplaint>(
  {
    complainant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    relatedTrip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    relatedRoute: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    relatedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    escalationLevel: { type: Number, default: 0 },
    attachments: {
      type: [{ key: { type: String, required: true }, addedAt: { type: Date, default: Date.now } }],
      default: [],
    },
    resolution: {
      type: {
        note: { type: String },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        resolvedAt: { type: Date },
      },
      default: null,
    },
    feedback: {
      type: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String, default: null },
        submittedAt: { type: Date },
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
          meta: { type: mongoose.Schema.Types.Mixed, default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

complaintSchema.index({ complainant: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ category: 1 });

export const Complaint = mongoose.model<IComplaint>("Complaint", complaintSchema);
