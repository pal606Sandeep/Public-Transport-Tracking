export type LostFoundKind = "LOST" | "FOUND";

export const LOST_FOUND_STATUSES = [
  "OPEN",
  "MATCHED",
  "CLAIMED",
  "RETURNED",
  "CLOSED",
] as const;
export type LostFoundStatus = (typeof LOST_FOUND_STATUSES)[number];

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

export interface LostFoundMatch {
  item: LostFoundItem;
  timeDeltaHours: number;
  termOverlap: number;
}

export interface MatchResult {
  source: LostFoundItem;
  windowDays: number;
  matches: LostFoundMatch[];
}

export interface LostFoundListParams {
  page?: number;
  limit?: number;
  kind?: LostFoundKind;
  status?: LostFoundStatus;
}

export const STATUS_TONE: Record<
  LostFoundStatus,
  "danger" | "info" | "warning" | "success" | "neutral"
> = {
  OPEN: "danger",
  MATCHED: "info",
  CLAIMED: "warning",
  RETURNED: "success",
  CLOSED: "neutral",
};
