import type { IncidentSeverity, IncidentStatus } from "./incident.types";

export const SEVERITY_TONE: Record<
  IncidentSeverity,
  "neutral" | "info" | "warning" | "danger"
> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const STATUS_TONE: Record<
  IncidentStatus,
  "danger" | "warning" | "info" | "success" | "neutral"
> = {
  OPEN: "danger",
  ACKNOWLEDGED: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};
