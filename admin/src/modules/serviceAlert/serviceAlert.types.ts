export const ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_TYPES = [
  "disruption",
  "closure",
  "weather",
  "emergency",
  "general",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export type AlertStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "EXPIRED";

export type Targeting =
  | { type: "all"; routeIds: string[]; stopIds: string[]; geoArea: unknown | null }
  | { type: "routes"; routeIds: string[]; stopIds: string[]; geoArea: unknown | null }
  | { type: "stops"; routeIds: string[]; stopIds: string[]; geoArea: unknown | null }
  | { type: "geoArea"; routeIds: string[]; stopIds: string[]; geoArea: unknown };

export interface ServiceAlert {
  _id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  targeting: {
    type: "all" | "routes" | "stops" | "geoArea";
    routeIds: string[];
    stopIds: string[];
    geoArea: unknown | null;
  };
  resolvedRouteIds: string[];
  resolvedStopIds: string[];
  startsAt: string;
  endsAt: string | null;
  status: AlertStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the form emits — targeting is a discriminated union the API expects. */
export type AlertTargetingInput =
  | { type: "all" }
  | { type: "routes"; routeIds: string[] }
  | { type: "stops"; stopIds: string[] };

export interface ServiceAlertInput {
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  targeting: AlertTargetingInput;
  startsAt: string;
  endsAt?: string | null;
  status?: "DRAFT" | "PUBLISHED";
}

export interface ServiceAlertListParams {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  type?: AlertType;
  search?: string;
}

export const SEVERITY_TONE: Record<
  AlertSeverity,
  "neutral" | "info" | "warning" | "danger"
> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const STATUS_TONE: Record<
  AlertStatus,
  "neutral" | "success" | "danger"
> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  CANCELLED: "danger",
  EXPIRED: "neutral",
};
