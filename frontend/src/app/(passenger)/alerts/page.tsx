"use client";

import { PageHeader, FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useServiceAlerts } from "@/modules/serviceAlert/hooks/useServiceAlerts";

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export default function AlertsPage() {
  const { data, isLoading, error } = useServiceAlerts();

  const alerts = [...(data ?? [])].sort(
    (a, b) =>
      (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) ||
      +new Date(b.startsAt) - +new Date(a.startsAt)
  );

  return (
    <>
      <PageHeader title="Service alerts" back />
      {isLoading ? (
        <FullScreenLoader />
      ) : error ? (
        <div className="p-4">
          <Alert tone="error">{errorMessage(error)}</Alert>
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No active alerts"
          hint="Disruptions, closures and weather notices show up here."
        />
      ) : (
        <ul className="divide-y">
          {alerts.map((a) => (
            <li key={a._id} className="p-4">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                    (a.severity === "CRITICAL" || a.severity === "HIGH"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {a.severity}
                </span>
                <span className="text-xs text-muted-foreground">{a.type}</span>
              </div>
              <p className="mt-1 text-sm font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(a.startsAt).toLocaleString()}
                {a.endsAt ? ` – ${new Date(a.endsAt).toLocaleString()}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
