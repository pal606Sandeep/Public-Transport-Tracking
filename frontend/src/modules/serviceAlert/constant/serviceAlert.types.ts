export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertType =
  | "disruption"
  | "closure"
  | "weather"
  | "emergency"
  | "general";

export interface ServiceAlert {
  _id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  targeting: {
    type: "routes" | "stops" | "geoArea" | "all";
    routeIds: string[];
    stopIds: string[];
    geoArea: unknown | null;
  };
  resolvedRouteIds: string[];
  resolvedStopIds: string[];
  startsAt: string;
  endsAt: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}
