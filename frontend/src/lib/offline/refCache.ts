"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/apiClient";
import { db, type RefDataEntry, type RefResource } from "./db";

/**
 * Offline mirror of the backend's reference data.
 *
 * The backend exposes `GET /sync/{routes,stops,schedules,fares}` which return
 * `{ data, checksum, generatedAt, count }` and accept `?updatedSince=<ISO>` to
 * send back only rows changed since then (plus a weak `ETag` / `304`). We keep
 * the newest `updatedAt` we've seen as a cursor and ask only for the delta on
 * every subsequent sync, then merge by `_id`. This is what lets the Routes /
 * Stops screens render with no network.
 */

type SyncPayload = {
  data: Record<string, unknown>[];
  checksum: string;
  generatedAt: string;
  count: number;
};

const RESOURCES: RefResource[] = ["routes", "stops", "schedules", "fares"];

/** `fares` has no per-row timestamps on the backend, so never send a cursor. */
const SUPPORTS_DELTA: Record<RefResource, boolean> = {
  routes: true,
  stops: true,
  schedules: true,
  fares: false,
};

const newestCursor = (rows: Record<string, unknown>[]): string | null => {
  let max = 0;
  for (const r of rows) {
    const t = Date.parse(String(r.updatedAt ?? r.createdAt ?? ""));
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max ? new Date(max).toISOString() : null;
};

const mergeById = (
  existing: Record<string, unknown>[],
  incoming: Record<string, unknown>[]
): Record<string, unknown>[] => {
  if (!incoming.length) return existing;
  const map = new Map(existing.map((r) => [String(r._id), r]));
  for (const r of incoming) map.set(String(r._id), r);
  return [...map.values()];
};

export async function syncResource(resource: RefResource): Promise<void> {
  const prev = await db.refData.get(resource);
  const useDelta = SUPPORTS_DELTA[resource] && prev?.cursor;
  const qs = useDelta ? `?updatedSince=${encodeURIComponent(prev!.cursor!)}` : "";

  const res = await api.get<SyncPayload>(`/sync/${resource}${qs}`);
  const payload = res.data;
  if (!payload) return;

  const merged = useDelta
    ? mergeById(prev?.items ?? [], payload.data)
    : payload.data;

  const entry: RefDataEntry = {
    resource,
    items: merged,
    checksum: payload.checksum,
    cursor: newestCursor(merged) ?? prev?.cursor ?? null,
    syncedAt: Date.now(),
  };
  await db.refData.put(entry);
}

/** Refresh every reference collection; failures are swallowed per-resource. */
export async function syncAllRefData(): Promise<void> {
  await Promise.allSettled(RESOURCES.map(syncResource));
}

export async function getCached<T = Record<string, unknown>>(
  resource: RefResource
): Promise<T[]> {
  const entry = await db.refData.get(resource);
  return (entry?.items as T[]) ?? [];
}

/**
 * Read a reference collection from the local mirror. `stale` is true until the
 * first successful sync of this session, so callers can show a subtle "offline
 * copy" hint.
 */
export function useCachedRef<T = Record<string, unknown>>(
  resource: RefResource
): { items: T[]; loading: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getCached<T>(resource).then((rows) => {
        if (!alive) return;
        setItems(rows);
        setLoading(false);
      });
    load();
    window.addEventListener("refdata:change", load);
    return () => {
      alive = false;
      window.removeEventListener("refdata:change", load);
    };
  }, [resource]);

  return { items, loading };
}
