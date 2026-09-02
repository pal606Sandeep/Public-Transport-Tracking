"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useSubmitOccupancy } from "../hooks/useConductor";

export function OccupancyCounter({
  vehicleId,
  tripId,
  capacity,
}: {
  vehicleId: string;
  tripId: string;
  capacity?: number | null;
}) {
  const [count, setCount] = useState(0);
  const [sent, setSent] = useState<number | null>(null);
  const submit = useSubmitOccupancy();

  const pct = capacity ? Math.round((count / capacity) * 100) : null;
  const tone =
    pct == null ? "" : pct < 60 ? "🟢" : pct < 90 ? "🟡" : "🔴";

  return (
    <section className="rounded-[var(--radius-app)] border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Onboard count {tone}
        </h2>
        {capacity != null && (
          <span className="text-xs text-muted-foreground">
            cap {capacity}
            {pct != null ? ` · ${pct}%` : ""}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => setCount((c) => Math.max(0, c - 1))}
          className="h-12 w-12 rounded-full border text-xl"
          aria-label="Decrease"
        >
          −
        </button>
        <span className="w-16 text-center text-3xl font-semibold tabular-nums">
          {count}
        </span>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="h-12 w-12 rounded-full border text-xl"
          aria-label="Increase"
        >
          +
        </button>
      </div>

      {submit.isError && (
        <Alert tone="error" className="mt-3">
          {errorMessage(submit.error)}
        </Alert>
      )}
      {sent != null && !submit.isPending && (
        <p className="mt-2 text-center text-xs text-[var(--success)]">
          Sent count of {sent}
        </p>
      )}

      <Button
        size="sm"
        fullWidth
        className="mt-3"
        loading={submit.isPending}
        onClick={async () => {
          await submit.mutateAsync({ vehicleId, tripId, passengerCount: count });
          setSent(count);
        }}
      >
        Send count
      </Button>
    </section>
  );
}
