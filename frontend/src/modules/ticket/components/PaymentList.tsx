"use client";

import { FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  PAYMENT_STATUS_LABEL,
  type PaymentStatus,
} from "../constant/ticket.types";
import { useMyPayments } from "../hooks/useTickets";

const STATUS_CLASS: Record<PaymentStatus, string> = {
  SUCCESS: "bg-success/10 text-success",
  PENDING: "bg-[color:#d97706]/10 text-[color:#b45309]",
  FAILED: "bg-destructive/10 text-destructive",
  REFUND_PENDING: "bg-muted text-muted-foreground",
  REFUNDED: "bg-muted text-muted-foreground",
};

export function PaymentList() {
  const { data, isLoading, error } = useMyPayments();

  if (isLoading) return <FullScreenLoader />;
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
    <ul className="divide-y">
      {list.map((p) => (
        <li key={p._id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {p.currency} {p.amount.toFixed(2)}
            </span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                (STATUS_CLASS[p.status] ?? "bg-muted text-muted-foreground")
              }
            >
              {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.method} · {p.payableFor} ·{" "}
            {new Date(p.createdAt).toLocaleString()}
          </p>
          {p.providerRef && (
            <p className="font-mono text-xs text-muted-foreground">
              {p.providerRef}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
