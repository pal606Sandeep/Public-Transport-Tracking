export const COMPLAINT_CATEGORIES = [
  "bus_delay",
  "driver_behavior",
  "conductor_behavior",
  "vehicle_condition",
  "cleanliness",
  "overcrowding",
  "route_issue",
  "fare_issue",
  "safety",
  "other",
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  bus_delay: "Bus delay",
  driver_behavior: "Driver behaviour",
  conductor_behavior: "Conductor behaviour",
  vehicle_condition: "Vehicle condition",
  cleanliness: "Cleanliness",
  overcrowding: "Overcrowding",
  route_issue: "Route issue",
  fare_issue: "Fare issue",
  safety: "Safety",
  other: "Other",
};

export const COMPLAINT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export interface Complaint {
  _id: string;
  complainant: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  relatedTrip: string | null;
  relatedRoute: string | null;
  relatedVehicle: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedTo: string | null;
  escalationLevel: number;
  attachments: { key: string; addedAt: string }[];
  resolution: {
    note: string;
    resolvedBy: string | null;
    resolvedAt: string;
  } | null;
  feedback: {
    rating: number;
    comment: string | null;
    submittedAt: string;
  } | null;
  historyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintHistoryEntry {
  action: string;
  by: string | null;
  at: string;
  note: string | null;
  meta: unknown | null;
}

export interface ComplaintListParams {
  page?: number;
  limit?: number;
  status?: ComplaintStatus;
  category?: ComplaintCategory;
  priority?: ComplaintPriority;
}

export const STATUS_TONE: Record<
  ComplaintStatus,
  "danger" | "info" | "warning" | "success" | "neutral"
> = {
  OPEN: "danger",
  IN_PROGRESS: "info",
  ESCALATED: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export const PRIORITY_TONE: Record<
  ComplaintPriority,
  "neutral" | "info" | "warning" | "danger"
> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};
