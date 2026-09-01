import mongoose, { Types } from "mongoose";

export type VehicleDocumentType = "REGISTRATION" | "INSURANCE" | "FITNESS" | "PUC";
export type VehicleDocumentStatus = "VALID" | "EXPIRING" | "EXPIRED";

export interface IVehicleDocument {
  vehicle: Types.ObjectId;
  type: VehicleDocumentType;
  documentNumber: string;
  issuedAt?: Date | null;
  expiresAt?: Date | null;
  status: VehicleDocumentStatus;
  attachmentKey?: string | null;
  reminderSentAt?: Date | null;
}

const vehicleDocumentSchema = new mongoose.Schema<IVehicleDocument>(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    type: {
      type: String,
      enum: ["REGISTRATION", "INSURANCE", "FITNESS", "PUC"],
      required: true,
    },
    documentNumber: { type: String, required: true, trim: true },
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["VALID", "EXPIRING", "EXPIRED"],
      default: "VALID",
    },
    attachmentKey: { type: String, default: null },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One document of each kind per vehicle.
vehicleDocumentSchema.index({ vehicle: 1, type: 1 }, { unique: true });

export const VehicleDocument = mongoose.model<IVehicleDocument>("VehicleDocument", vehicleDocumentSchema);
