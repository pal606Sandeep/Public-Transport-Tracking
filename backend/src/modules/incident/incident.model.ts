import mongoose, { Types } from "mongoose";

export type IncidentType = "accident" | "breakdown" | "passenger incident" | "traffic" | "route issue" | "other";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentSource = "MANUAL" | "DRIVER_SOS" | "ROUTE_DEVIATION" | "GPS_FAILURE" | "VEHICLE_OFFLINE";

export interface IIncidentTimelineEntry {
  at: Date;
  status: IncidentStatus;
  by?: string | null;
  note?: string | null;
}

export interface IIncident {
  type: IncidentType;
  status: IncidentStatus;
  severity: IncidentSeverity;
  source: IncidentSource;
  /** Dedup key for signal-derived incidents — unique per (source, signalTraceId). */
  signalTraceId?: string | null;
  vehicleId?: Types.ObjectId | null;
  tripId?: Types.ObjectId | null;
  routeId?: Types.ObjectId | null;
  driverId?: Types.ObjectId | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
  title: string;
  description?: string | null;
  acknowledgedBy?: Types.ObjectId | null;
  acknowledgedAt?: Date | null;
  assignedTo?: Types.ObjectId | null;
  assignedAt?: Date | null;
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  closedBy?: Types.ObjectId | null;
  closedAt?: Date | null;
  timeline: IIncidentTimelineEntry[];
  deletedAt?: Date | null;
}

const incidentSchema = new mongoose.Schema<IIncident>(
  {
    type: { type: String, enum: ["accident", "breakdown", "passenger incident", "traffic", "route issue", "other"], required: true },
    status: {
      type: String,
      enum: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    source: {
      type: String,
      enum: ["MANUAL", "DRIVER_SOS", "ROUTE_DEVIATION", "GPS_FAILURE", "VEHICLE_OFFLINE"],
      default: "MANUAL",
    },
    signalTraceId: { type: String, default: null },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 2000 },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    acknowledgedAt: { type: Date, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    closedAt: { type: Date, default: null },
    timeline: [
      {
        at: { type: Date, default: Date.now },
        status: { type: String, enum: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"], required: true },
        by: { type: String, default: null },
        note: { type: String, default: null },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ type: 1 });
incidentSchema.index({ vehicleId: 1, createdAt: -1 });
incidentSchema.index({ tripId: 1, createdAt: -1 });
incidentSchema.index({ assignedTo: 1, status: 1 });
// At-least-once dedup for signal-derived incidents.
incidentSchema.index({ source: 1, signalTraceId: 1 }, { unique: true, partialFilterExpression: { signalTraceId: { $ne: null } } });

export const Incident = mongoose.model<IIncident>("Incident", incidentSchema);
