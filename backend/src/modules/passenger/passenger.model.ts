import mongoose, { Types } from "mongoose";

export interface IPassenger {
  userId: Types.ObjectId;
  preferences: {
    language?: string;
    theme?: "light" | "dark" | "system";
    notifications?: {
      serviceAlerts: boolean;
      favourites: boolean;
      promotions: boolean;
    };
    seatPreference?: string;
  };
  favouriteRouteIds: Types.ObjectId[];
  favouriteStopIds: Types.ObjectId[];
  blocked: boolean;
  blockedReason?: string | null;
  blockedAt?: Date | null;
}

const passengerSchema = new mongoose.Schema<IPassenger>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    preferences: {
      language: { type: String, default: "en" },
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      notifications: {
        serviceAlerts: { type: Boolean, default: true },
        favourites: { type: Boolean, default: true },
        promotions: { type: Boolean, default: false },
      },
      seatPreference: { type: String, default: null },
    },
    favouriteRouteIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    favouriteStopIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    blocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: null },
    blockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passengerSchema.index({ userId: 1 }, { unique: true });
passengerSchema.index({ blocked: 1 });

export const Passenger = mongoose.model<IPassenger>("Passenger", passengerSchema);
