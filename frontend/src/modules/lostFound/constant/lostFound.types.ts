export type LostFoundKind = "LOST" | "FOUND";

export type LostFoundStatus =
  | "OPEN"
  | "MATCHED"
  | "CLAIMED"
  | "RETURNED"
  | "CLOSED";

export interface LostFoundItem {
  _id: string;
  kind: LostFoundKind;
  reportedBy: string | null;
  reporterName: string | null;
  reporterContact: string | null;
  title: string;
  description: string;
  category: string | null;
  color: string | null;
  route: string | null;
  vehicle: string | null;
  trip: string | null;
  occurredAt: string;
  attachments: { key: string; addedAt: string }[];
  status: LostFoundStatus;
  assignedTo: string | null;
  matchedWith: string | null;
  resolution: {
    returnedTo: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    note: string | null;
  } | null;
  history: { action: string; by: string | null; at: string; note: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLostFoundInput {
  kind: LostFoundKind;
  title: string;
  description: string;
  category?: string | null;
  color?: string | null;
  occurredAt: string;
  reporterContact?: string | null;
  attachmentKeys?: string[];
}

export const KIND_LABEL: Record<LostFoundKind, string> = {
  LOST: "I lost something",
  FOUND: "I found something",
};

export const STATUS_LABEL: Record<LostFoundStatus, string> = {
  OPEN: "Open",
  MATCHED: "Possible match",
  CLAIMED: "Claimed",
  RETURNED: "Returned",
  CLOSED: "Closed",
};
