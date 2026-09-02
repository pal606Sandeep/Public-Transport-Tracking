"use client";

import Link from "next/link";
import { FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  TICKET_STATUS_LABEL,
  type TicketStatus,
} from "../constant/ticket.types";
import { useMyTickets } from "../hooks/useTickets";

const STATUS_CLASS: Record<TicketStatus, string> = {
  CONFIRMED: "bg-success/10 text-success",
  PENDING_PAYMENT: "bg-[color:#d97706]/10 text-[color:#b45309]",
  USED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
};

export function TicketList() {
  const { data, isLoading, error } = useMyTickets();

  if (isLoading) return <FullScreenLoader />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const list = data?.tickets ?? [];
  if (list.length === 0)
    return (
      <EmptyState
        title="No tickets yet"
        hint="Buy a ticket for your next trip and it'll appear here."
      />
    );

  return (
    <ul className="divide-y">
      {list.map((t) => (
        <li key={t._id}>
          <Link href={`/tickets/${t._id}`} className="block p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {t.routeNumber ? `Route ${t.routeNumber}` : "Ticket"}
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                  (STATUS_CLASS[t.status] ?? "bg-muted text-muted-foreground")
                }
              >
                {TICKET_STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t.boardingStopName || "—"} → {t.destinationStopName || "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.currency} {t.amount.toFixed(2)} ·{" "}
              {new Date(t.createdAt).toLocaleString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
