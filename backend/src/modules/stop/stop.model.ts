import mongoose, { Types } from "mongoose";

export interface IStop {
  name: string;
  code?: string | null;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  address?: string | null;
  facilities?: (string | null)[];
  shelter?: string | null;
  accessibility?: boolean;
  nearbyLandmarks?: (string | null)[];
  routes?: Types.ObjectId[];
  isActive: boolean;
  deletedAt?: Date | null;
}

const stopSchema = new mongoose.Schema<IStop>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v: number[]) => v.length === 2,
          message: "location.coordinates must be [lng, lat] with exactly 2 numbers",
        },
      },
    },
    address: { type: String, default: null },
    facilities: { type: [String], default: [] },
    shelter: { type: String, default: null },
    accessibility: { type: Boolean, default: false },
    nearbyLandmarks: { type: [String], default: [] },
    routes: { type: [mongoose.Schema.Types.ObjectId], ref: "Route", default: [] },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

stopSchema.index({ location: "2dsphere" });
stopSchema.index({ code: 1 });
stopSchema.index({ name: 1 });

export const Stop = mongoose.model<IStop>("Stop", stopSchema);
