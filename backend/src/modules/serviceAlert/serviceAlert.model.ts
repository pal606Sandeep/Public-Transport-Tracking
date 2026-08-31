import mongoose, { Types } from "mongoose";

export type ServiceAlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ServiceAlertType = "disruption" | "closure" | "weather" | "emergency" | "general";
export type ServiceAlertTargetingType = "routes" | "stops" | "geoArea" | "all";
export type ServiceAlertStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface IServiceAlertTargeting {
  type: ServiceAlertTargetingType;
  routeIds: Types.ObjectId[];
  stopIds: Types.ObjectId[];
  geoArea?: {
    type: "Polygon";
    coordinates: number[][][];
  } | null;
}

export interface IServiceAlert {
  title: string;
  message: string;
  severity: ServiceAlertSeverity;
  type: ServiceAlertType;
  targeting: IServiceAlertTargeting;
  /** Denormalized on create/update/publish so public reads filter without re-resolving geoArea each time. */
  resolvedRouteIds: Types.ObjectId[];
  resolvedStopIds: Types.ObjectId[];
  startsAt: Date;
  endsAt?: Date | null;
  status: ServiceAlertStatus;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
}

const targetingSchema = new mongoose.Schema<IServiceAlertTargeting>(
  {
    type: { type: String, enum: ["routes", "stops", "geoArea", "all"], required: true },
    routeIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Route", default: [] },
    stopIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Stop", default: [] },
    geoArea: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: { type: [[[Number]]], default: undefined },
    },
  },
  { _id: false, versionKey: false }
);

const serviceAlertSchema = new mongoose.Schema<IServiceAlert>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    type: { type: String, enum: ["disruption", "closure", "weather", "emergency", "general"], required: true },
    targeting: { type: targetingSchema, required: true },
    resolvedRouteIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Route", default: [] },
    resolvedStopIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Stop", default: [] },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "CANCELLED"], default: "DRAFT" },
    publishedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

serviceAlertSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
serviceAlertSchema.index({ resolvedRouteIds: 1 });
serviceAlertSchema.index({ resolvedStopIds: 1 });
serviceAlertSchema.index({ "targeting.geoArea": "2dsphere" });

export const ServiceAlert = mongoose.model<IServiceAlert>("ServiceAlert", serviceAlertSchema);
