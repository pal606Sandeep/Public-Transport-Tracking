"use client";

import { FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useMyPasses, useActivePass } from "../hooks/useTickets";

export function PassList() {
  const { data: passes, isLoading, error } = useMyPasses();
  const { data: active } = useActivePass();

  if (isLoading) return <FullScreenLoader />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const list = passes ?? [];

  return (
    <div className="flex flex-col gap-4 p-4">
      {active ? (
        <div className="rounded-[var(--radius-app)] border border-success/40 bg-success/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">
            Active pass
          </p>
          <p className="mt-1 text-sm font-medium">{active.passName}</p>
          <p className="text-xs text-muted-foreground">
            {active.unlimited ? "Unlimited rides" : `${active.usedCount} rides used`}
            {active.expiresAt
              ? ` · expires ${new Date(active.expiresAt).toLocaleDateString()}`
              : ""}
          </p>
        </div>
      ) : (
        <Alert tone="info">
          No active pass. Passes cover fares automatically while valid.
        </Alert>
      )}

      {list.length === 0 ? (
        <EmptyState title="No passes" hint="Your purchased passes appear here." />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((p) => (
            <li
              key={p._id}
              className="rounded-[var(--radius-app)] border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{p.passName}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {p.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.currency} {p.price.toFixed(2)} · bought{" "}
                {new Date(p.purchasedAt).toLocaleDateString()}
                {p.expiresAt
                  ? ` · until ${new Date(p.expiresAt).toLocaleDateString()}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
