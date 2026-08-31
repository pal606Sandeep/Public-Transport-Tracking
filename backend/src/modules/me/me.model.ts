import mongoose, { Types } from "mongoose";

export interface IAssignmentRequest {
  user: Types.ObjectId;
  staffType: "DRIVER" | "CONDUCTOR";
  staffId: Types.ObjectId;
  requestedDate: Date;
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  note?: string | null;
  deletedAt?: Date | null;
}

const assignmentRequestSchema = new mongoose.Schema<IAssignmentRequest>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    staffType: { type: String, enum: ["DRIVER", "CONDUCTOR"], required: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requestedDate: { type: Date, required: true },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    note: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

assignmentRequestSchema.index({ user: 1, status: 1 });
assignmentRequestSchema.index({ status: 1 });

export const AssignmentRequest = mongoose.model<IAssignmentRequest>(
  "AssignmentRequest",
  assignmentRequestSchema
);
