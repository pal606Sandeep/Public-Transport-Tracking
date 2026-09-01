import mongoose from "mongoose";

const dispatchMessageSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    priority: { type: String, enum: ["NORMAL", "URGENT"], default: "NORMAL" },
    targetVehicleId: { type: String, default: null },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

dispatchMessageSchema.index({ createdAt: -1 });
dispatchMessageSchema.index({ fromUserId: 1, createdAt: -1 });

export const DispatchMessage = mongoose.model("DispatchMessage", dispatchMessageSchema);