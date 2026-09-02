"use client";

import { cn } from "@/lib/cn";
import { useServiceAlerts } from "../hooks/useServiceAlerts";
import type { AlertSeverity } from "../constant/serviceAlert.types";

const sevClass: Record<AlertSeverity, string> = {
  LOW: "border-border bg-muted text-foreground",
  MEDIUM: "border-[var(--warning,#d97706)]/40 bg-[color:#d97706]/10 text-[color:#b45309]",
  HIGH: "border-destructive/40 bg-destructive/10 text-destructive",
  CRITICAL: "border-destructive bg-destructive/15 text-destructive",
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      {alerts.slice(0, 3).map((a) => (
        <div
          key={a._id}
          className={cn(
            "rounded-[var(--radius-app)] border px-3 py-2 text-xs",
            sevClass[a.severity] ?? sevClass.MEDIUM
          )}
        >
          <span className="font-semibold">{a.title}</span>
          <span className="mx-1">·</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}
