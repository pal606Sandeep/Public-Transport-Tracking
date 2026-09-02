"use client";

import {
  PageHeader,
  EmptyState,
  Alert,
  Card,
  Badge,
  SkeletonList,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useServiceAlerts } from "@/modules/serviceAlert/hooks/useServiceAlerts";

const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
const SEV_TONE = {
  CRITICAL: "danger",
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
} as const;

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
        <SkeletonList rows={5} />
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
        <div className="flex flex-col gap-3 p-4">
          {alerts.map((a) => (
            <Card key={a._id} className="p-4">
              <div className="flex items-center gap-2">
                <Badge tone={SEV_TONE[a.severity] ?? "neutral"}>
                  {a.severity}
                </Badge>
                <span className="text-[12px] font-medium capitalize text-muted-foreground">
                  {a.type}
                </span>
              </div>
              <p className="mt-2 text-[15px] font-semibold">{a.title}</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-muted-foreground">
                {a.message}
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {new Date(a.startsAt).toLocaleDateString([], {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {a.endsAt
                  ? ` – ${new Date(a.endsAt).toLocaleDateString([], {
                      day: "numeric",
                      month: "short",
                    })}`
                  : ""}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
