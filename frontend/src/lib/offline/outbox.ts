"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { db, type OutboxEntry } from "./db";

/**
 * A tiny durable write queue. When the network is down (or a request fails to
 * even leave the device) we stash the request here and replay it later — on the
 * next `online` event, on app start, or from the service worker's Background
 * Sync handler.
 */

const SYNC_TAG = "transit-outbox";

type EnqueueInput = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  label: string;
};

/** Broadcasts so open tabs can refresh their "pending" badge immediately. */
const notifyChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("outbox:change"));
  }
};

export async function enqueue(input: EnqueueInput): Promise<void> {
  const token = getAccessToken();
  const entry: OutboxEntry = {
    url: input.url,
    method: input.method.toUpperCase(),
    headers: {
      ...(input.headers ?? {}),
      // Best-effort seed so the service worker can replay us with no tab open.
      // A live tab's flushOutbox() re-stamps this with a fresh token anyway.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body:
      input.body === undefined
        ? null
        : typeof input.body === "string"
          ? input.body
          : JSON.stringify(input.body),
    label: input.label,
    createdAt: Date.now(),
    attempts: 0,
  };
  await db.outbox.add(entry);
  notifyChange();

  // Ask the browser to flush us in the background even if the tab is closed.
  try {
    const reg = await navigator.serviceWorker?.ready;
    // `sync` is not in every browser's lib.dom typings yet.
    await (
      reg as unknown as { sync?: { register(tag: string): Promise<void> } }
    )?.sync?.register(SYNC_TAG);
  } catch {
    /* Background Sync unavailable — the online listener still covers us. */
  }
}

export async function outboxCount(): Promise<number> {
  return db.outbox.count();
}

let flushing = false;

/**
 * Replay every queued request oldest-first. A fresh access token is attached at
 * send time (the one captured when the request was queued may have expired).
 * Entries that still fail with a network error are kept for the next attempt;
 * ones the server actively rejects (4xx) are dropped so they can't wedge the
 * queue forever.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) {
    return { sent: 0, failed: 0 };
  }
  flushing = true;
  let sent = 0;
  let failed = 0;

  try {
    const entries = await db.outbox.orderBy("createdAt").toArray();
    const token = getAccessToken();

    for (const entry of entries) {
      try {
        const res = await fetch(entry.url, {
          method: entry.method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...entry.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: entry.body ?? undefined,
        });

        if (res.ok || (res.status >= 400 && res.status < 500)) {
          // Delivered, or permanently rejected — either way, stop retrying it.
          await db.outbox.delete(entry.id!);
          if (res.ok) sent += 1;
          else failed += 1;
        } else {
          await db.outbox.update(entry.id!, { attempts: entry.attempts + 1 });
          failed += 1;
        }
      } catch {
        // Still offline / server unreachable — leave it queued.
        await db.outbox.update(entry.id!, { attempts: entry.attempts + 1 });
        failed += 1;
      }
    }
  } finally {
    flushing = false;
    notifyChange();
  }

  return { sent, failed };
}

/** Live count of queued writes, for a "3 changes will sync when you're back" pill. */
export function useOutboxCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      outboxCount().then((n) => {
        if (alive) setCount(n);
      });
    };
    refresh();
    window.addEventListener("outbox:change", refresh);
    window.addEventListener("online", refresh);
    return () => {
      alive = false;
      window.removeEventListener("outbox:change", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  return count;
}
