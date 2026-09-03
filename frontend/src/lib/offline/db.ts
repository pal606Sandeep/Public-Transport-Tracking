import Dexie, { type Table } from "dexie";

/**
 * One IndexedDB database for everything the PWA needs to work offline.
 *
 * - `outbox`   — writes made while offline, replayed on reconnect / Background Sync.
 * - `refData`  — a local mirror of the backend's reference collections
 *                (routes / stops / schedules / fares) kept fresh with the
 *                `GET /sync/*?updatedSince=` delta endpoints.
 *
 * The service worker (`public/sw.js`) opens this same database by name during a
 * `sync` event, so the schema here is deliberately plain (no Dexie-only types on
 * disk) and must stay in step with the raw IndexedDB code over there.
 */

export interface OutboxEntry {
  id?: number;
  /** absolute URL to replay, e.g. `${API_BASE_URL}/complaints` */
  url: string;
  method: string;
  /** header name -> value; carries a best-effort Authorization, re-stamped on replay */
  headers: Record<string, string>;
  /** JSON string body, already serialised */
  body: string | null;
  /** short human label for the "pending" UI ("Complaint", "Feedback", …) */
  label: string;
  createdAt: number;
  attempts: number;
}

export type RefResource = "routes" | "stops" | "schedules" | "fares";

export interface RefDataEntry {
  resource: RefResource;
  items: Record<string, unknown>[];
  /** backend checksum of the full set — lets us detect drift */
  checksum: string;
  /** ISO timestamp of the newest record we hold; sent back as `updatedSince` */
  cursor: string | null;
  syncedAt: number;
}

class OfflineDB extends Dexie {
  outbox!: Table<OutboxEntry, number>;
  refData!: Table<RefDataEntry, RefResource>;

  constructor() {
    super("transit-offline");
    this.version(1).stores({
      outbox: "++id, createdAt",
      refData: "resource",
    });
  }
}

export const OFFLINE_DB_NAME = "transit-offline";
export const OUTBOX_STORE = "outbox";

export const db = new OfflineDB();
