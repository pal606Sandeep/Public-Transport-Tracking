import mongoose, { Types } from "mongoose";

export interface ISavedLocation {
  userId: Types.ObjectId;
  name: string;
  location: { type: "Point"; coordinates: [number, number] };
  address?: string | null;
  isHome: boolean;
  isWork: boolean;
}

const savedLocationSchema = new mongoose.Schema<ISavedLocation>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, default: null },
    isHome: { type: Boolean, default: false },
    isWork: { type: Boolean, default: false },
  },
  { timestamps: true }
);

savedLocationSchema.index({ userId: 1, createdAt: -1 });
savedLocationSchema.index({ location: "2dsphere" });

export const SavedLocation = mongoose.model<ISavedLocation>("SavedLocation", savedLocationSchema);
