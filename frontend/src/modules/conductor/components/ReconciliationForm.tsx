"use client";

import { useState } from "react";
import { Button, Field, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useReconcile } from "../hooks/useConductor";

export function ReconciliationForm({ tripId }: { tripId: string }) {
  const recon = useReconcile();
  const [tickets, setTickets] = useState("");
  const [cash, setCash] = useState("");
  const [digital, setDigital] = useState("");

  const result = recon.data;

  if (result) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <ul className="divide-y rounded-[var(--radius-app)] border">
          {(
            [
              ["Tickets issued (₹)", result.expected],
              ["Collected (₹)", result.collected],
              ["Variance (₹)", result.variance],
            ] as [string, number][]
          ).map(([k, v]) => (
            <li
              key={k}
              className="flex justify-between px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">{k}</span>
              <span
                className={
                  "font-medium " +
                  (k.startsWith("Variance") && v !== 0
                    ? "text-destructive"
                    : "")
                }
              >
                {v}
              </span>
            </li>
          ))}
        </ul>
        {result.variance === 0 ? (
          <Alert tone="success">Balanced — no variance.</Alert>
        ) : (
          <Alert tone="error">
            {result.variance > 0 ? "Over" : "Short"} by ₹
            {Math.abs(result.variance)}.
          </Alert>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        recon.mutate({
          tripId,
          ticketsIssued: Number(tickets) || 0,
          cashCollected: Number(cash) || 0,
          digitalCollected: Number(digital) || 0,
        });
      }}
    >
      {recon.isError && <Alert tone="error">{errorMessage(recon.error)}</Alert>}

      <Field label="Tickets issued (total ₹)">
        {(p) => (
          <Input
            {...p}
            inputMode="decimal"
            value={tickets}
            onChange={(e) => setTickets(e.target.value)}
          />
        )}
      </Field>
      <Field label="Cash collected (₹)">
        {(p) => (
          <Input
            {...p}
            inputMode="decimal"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        )}
      </Field>
      <Field label="Digital collected (₹)">
        {(p) => (
          <Input
            {...p}
            inputMode="decimal"
            value={digital}
            onChange={(e) => setDigital(e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" fullWidth loading={recon.isPending}>
        Reconcile
      </Button>
    </form>
  );
}
