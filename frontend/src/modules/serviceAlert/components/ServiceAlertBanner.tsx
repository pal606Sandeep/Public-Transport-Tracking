"use client";

import { cn } from "@/lib/cn";
import { useServiceAlerts } from "../hooks/useServiceAlerts";
import type { AlertSeverity } from "../constant/serviceAlert.types";

const sevClass: Record<AlertSeverity, string> = {
  LOW: "border-border bg-muted text-foreground",
  MEDIUM:
    "border-[var(--warning)]/30 bg-[var(--warning)]/[0.10] text-[color:var(--warning)]",
  HIGH: "border-destructive/30 bg-destructive/[0.08] text-destructive",
  CRITICAL: "border-destructive/50 bg-destructive/[0.12] text-destructive",
};

/** Compact banner: currently active alerts for a route/stop (or all). */
export function ServiceAlertBanner({
  routeId,
  stopId,
  className,
}: {
  routeId?: string;
  stopId?: string;
  className?: string;
}) {
  const { data } = useServiceAlerts({ routeId, stopId });
  const alerts = data ?? [];
  if (alerts.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {alerts.slice(0, 3).map((a) => (
        <div
          key={a._id}
          className={cn(
            "flex gap-2.5 rounded-[var(--radius-app)] border px-3.5 py-3 text-[13px] leading-snug",
            sevClass[a.severity] ?? sevClass.MEDIUM
          )}
        >
          <svg
            className="mt-0.5 shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 9v4m0 4h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            <span className="font-semibold">{a.title}</span>
            <span className="opacity-80"> — {a.message}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
