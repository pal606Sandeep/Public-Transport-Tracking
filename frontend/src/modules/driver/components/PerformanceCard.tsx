"use client";

import { Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { usePerformance } from "../hooks/useDriver";

export function PerformanceCard() {
  const { data, isLoading, error } = usePerformance();

  if (isLoading)
    return (
      <div className="h-40 animate-pulse rounded-[var(--radius-app)] bg-muted" />
    );
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;
  if (!data) return null;

  const rows: [string, string][] = [
    ["Employee ID", data.employeeId],
    ["Status", data.status],
    [
      "Licence expiry",
      data.licenseExpiry
        ? `${new Date(data.licenseExpiry).toLocaleDateString()}${
            data.licenseExpiryDays != null
              ? ` (${data.licenseExpiryDays}d)`
              : ""
          }`
        : "—",
    ],
    ["Complaints", String(data.complaintsCount)],
    [
      "On-time %",
      data.metrics.onTimePct != null ? `${data.metrics.onTimePct}%` : "—",
    ],
    [
      "Trips completed",
      data.metrics.tripsCompleted != null
        ? String(data.metrics.tripsCompleted)
        : "—",
    ],
  ];

  return (
    <div className="rounded-[var(--radius-app)] border">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{data.name}</p>
      </div>
      <ul className="divide-y">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </li>
        ))}
      </ul>
      {data.licenseExpiryDays != null && data.licenseExpiryDays <= 30 && (
        <Alert tone="error" className="m-3">
          Licence expires in {data.licenseExpiryDays} days — renew soon.
        </Alert>
      )}
    </div>
  );
}
