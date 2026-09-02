"use client";

import { Alert, EmptyState } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useTripTickets } from "../hooks/useConductor";

export function TicketList() {
  const { data, isLoading, error } = useTripTickets();

  if (isLoading)
    return (
      <div className="h-24 animate-pulse rounded-[var(--radius-app)] bg-muted" />
    );
  if (error) return <Alert tone="error">{errorMessage(error)}</Alert>;

  const tickets = data?.tickets ?? [];
  if (tickets.length === 0)
    return <EmptyState title="No tickets issued yet" />;

  return (
    <ul className="divide-y rounded-[var(--radius-app)] border">
      {tickets.map((t) => (
        <li
          key={t._id}
          className="flex items-center justify-between px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <div className="font-medium">
              {t.currency === "INR" ? "₹" : ""}
              {t.amount} · {t.passengerCategory}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {t.boardingStopName ?? "—"} → {t.destinationStopName ?? "—"} ·{" "}
              {t.paymentMethod}
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {t.status.toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
}
