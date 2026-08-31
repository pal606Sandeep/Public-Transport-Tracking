import mongoose, { Types } from "mongoose";

export const RECENT_SEARCH_CAP = 10;

export interface IRecentSearch {
  userId: Types.ObjectId;
  type: "route" | "stop" | "place" | "journey";
  term?: string | null;
  targetId?: Types.ObjectId | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
  results: number;
}

const recentSearchSchema = new mongoose.Schema<IRecentSearch>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["route", "stop", "place", "journey"], required: true },
    term: { type: String, default: null },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
    },
    results: { type: Number, default: 0 },
  },
  { timestamps: true }
);

recentSearchSchema.index({ userId: 1, createdAt: -1 });

export const RecentSearch = mongoose.model<IRecentSearch>("RecentSearch", recentSearchSchema);
