export const MAINTENANCE_TYPES = [
  "SERVICE",
  "REPAIR",
  "TYRE",
  "OIL",
  "INSPECTION",
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export interface MaintenanceRecord {
  _id: string;
  vehicle: string;
  type: MaintenanceType;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  scheduledDate: string | null;
  completedAt: string | null;
  cost: number | null;
  odometerKm: number | null;
  provider: string | null;
  parts: { name: string; quantity: number; cost: number }[];
  notes: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceInput {
  type: MaintenanceType;
  title: string;
  description?: string | null;
  status?: MaintenanceStatus;
  scheduledDate?: string | null;
  cost?: number | null;
  odometerKm?: number | null;
  provider?: string | null;
}

export const DOCUMENT_TYPES = [
  "REGISTRATION",
  "INSURANCE",
  "FITNESS",
  "PUC",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type DocumentStatus = "VALID" | "EXPIRING" | "EXPIRED";

export interface VehicleDocument {
  _id: string;
  vehicle: string;
  type: DocumentType;
  documentNumber: string;
  issuedAt: string | null;
  expiresAt: string | null;
  status: DocumentStatus;
  daysLeft: number;
  attachmentKey: string | null;
  reminderSentAt: string | null;
}

export interface VehicleDocumentInput {
  type: DocumentType;
  documentNumber: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
}
