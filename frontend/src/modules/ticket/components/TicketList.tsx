"use client";

import {
  EmptyState,
  Alert,
  Card,
  Badge,
  SkeletonList,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  TICKET_STATUS_LABEL,
  type TicketStatus,
} from "../constant/ticket.types";
import { useMyTickets } from "../hooks/useTickets";

const STATUS_TONE: Record<
  TicketStatus,
  "success" | "warning" | "neutral" | "danger"
> = {
  CONFIRMED: "success",
  PENDING_PAYMENT: "warning",
  USED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "danger",
};

export function TicketList() {
  const { data, isLoading, error } = useMyTickets();

  if (isLoading) return <SkeletonList rows={5} />;
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
    <div className="flex flex-col gap-3 p-4">
      {list.map((t) => (
        <Card key={t._id} href={`/tickets/${t._id}`} interactive className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-semibold">
              {t.routeNumber ? `Route ${t.routeNumber}` : "Ticket"}
            </span>
            <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>
              {TICKET_STATUS_LABEL[t.status] ?? t.status}
            </Badge>
          </div>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {t.boardingStopName || "—"} → {t.destinationStopName || "—"}
          </p>
          <p className="tnum mt-2 text-[12.5px] text-muted-foreground">
            {t.currency} {t.amount.toFixed(2)} ·{" "}
            {new Date(t.createdAt).toLocaleDateString([], {
              day: "numeric",
              month: "short",
            })}
          </p>
        </Card>
      ))}
    </div>
  );
}
