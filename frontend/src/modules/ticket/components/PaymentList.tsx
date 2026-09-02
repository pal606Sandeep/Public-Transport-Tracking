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
  PAYMENT_STATUS_LABEL,
  type PaymentStatus,
} from "../constant/ticket.types";
import { useMyPayments } from "../hooks/useTickets";

const STATUS_TONE: Record<
  PaymentStatus,
  "success" | "warning" | "danger" | "neutral"
> = {
  SUCCESS: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUND_PENDING: "neutral",
  REFUNDED: "neutral",
};

export function PaymentList() {
  const { data, isLoading, error } = useMyPayments();

  if (isLoading) return <SkeletonList rows={5} />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const list = data?.payments ?? [];
  if (list.length === 0)
    return (
      <EmptyState
        title="No payments"
        hint="Online payments for tickets and passes show up here."
      />
    );

  return (
    <div className="flex flex-col gap-3 p-4">
      {list.map((p) => (
        <Card key={p._id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="tnum text-[15px] font-bold">
              {p.currency} {p.amount.toFixed(2)}
            </span>
            <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>
              {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
            </Badge>
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {p.method} · {p.payableFor} ·{" "}
            {new Date(p.createdAt).toLocaleDateString([], {
              day: "numeric",
              month: "short",
            })}
          </p>
          {p.providerRef && (
            <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
              {p.providerRef}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
