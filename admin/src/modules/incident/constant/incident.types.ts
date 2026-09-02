export const INCIDENT_TYPES = [
  "accident",
  "breakdown",
  "passenger incident",
  "traffic",
  "route issue",
  "other",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_SOURCES = [
  "MANUAL",
  "DRIVER_SOS",
  "ROUTE_DEVIATION",
  "GPS_FAILURE",
  "VEHICLE_OFFLINE",
] as const;

export interface IncidentTimelineEntry {
  at: string;
  status: string;
  by: string | null;
  note: string | null;
}

export interface Incident {
  _id: string;
  type: IncidentType;
  status: IncidentStatus;
  severity: IncidentSeverity;
  source: string;
  signalTraceId: string | null;
  title: string;
  description: string | null;
  vehicleId: string | null;
  tripId: string | null;
  routeId: string | null;
  driverId: string | null;
  location: { type: "Point"; coordinates: [number, number] } | null;
  acknowledgedAt: string | null;
  assignedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  timeline: IncidentTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  type: IncidentType;
  title: string;
  description?: string | null;
  severity?: IncidentSeverity;
  vehicleId?: string | null;
  routeId?: string | null;
  driverId?: string | null;
}

export interface IncidentListParams {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  type?: IncidentType;
  source?: string;
  search?: string;
}
