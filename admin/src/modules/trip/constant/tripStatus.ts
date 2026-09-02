import type { TripStatus } from "./trip.types";

export const TRIP_STATUS_TONE: Record<
  TripStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  SCHEDULED: "neutral",
  ASSIGNED: "info",
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
  MISSED: "danger",
};
