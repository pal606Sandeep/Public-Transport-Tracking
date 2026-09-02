"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function TrackingStatusBar({
  supported,
  active,
  trackingPaused,
  pendingFixes,
  lastFixAt,
  error,
  onSyncNow,
}: {
  supported: boolean;
  active: boolean;
  trackingPaused: boolean;
  pendingFixes: number;
  lastFixAt: number | null;
  error: string | null;
  onSyncNow: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const tone = !supported || error
    ? "bg-destructive/10 text-destructive"
    : trackingPaused
      ? "bg-[color:var(--muted)] text-muted-foreground"
      : active
        ? "bg-[var(--success)]/10 text-[var(--success)]"
        : "bg-muted text-muted-foreground";

  const label = !supported
    ? "Location not available on this device"
    : error
      ? error
      : trackingPaused
        ? "Tracking paused — keep this screen on & app open"
        : active
          ? "Tracking active"
          : "Starting tracking…";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2 text-xs",
        tone
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            active && !trackingPaused ? "bg-current" : "bg-current/50"
          )}
        />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {lastFixAt && (
          <span className="opacity-70">
            {Math.max(0, Math.round((now - lastFixAt) / 1000))}s ago
          </span>
        )}
        {pendingFixes > 0 && (
          <button
            type="button"
            onClick={onSyncNow}
            className="rounded-full bg-current/10 px-2 py-0.5 font-medium"
          >
            {pendingFixes} queued · sync
          </button>
        )}
      </div>
    </div>
  );
}
