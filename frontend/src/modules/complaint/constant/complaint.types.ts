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

export type ComplaintStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export interface Complaint {
  _id: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  relatedTrip: string | null;
  relatedRoute: string | null;
  relatedVehicle: string | null;
  status: ComplaintStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  escalationLevel: number;
  attachments: { key: string; addedAt: string }[];
  resolution?: { note: string } | null;
  createdAt: string;
}

export interface CreateComplaintInput {
  category: ComplaintCategory;
  subject: string;
  description: string;
  relatedTrip?: string | null;
  relatedRoute?: string | null;
  relatedVehicle?: string | null;
  attachmentKeys?: string[];
}
