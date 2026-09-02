"use client";

import {
  EmptyState,
  Alert,
  Card,
  Badge,
  SkeletonList,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useMyPasses, useActivePass } from "../hooks/useTickets";

export function PassList() {
  const { data: passes, isLoading, error } = useMyPasses();
  const { data: active } = useActivePass();

  if (isLoading) return <SkeletonList rows={4} />;
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
        <Card className="overflow-hidden border-0 bg-primary p-5 text-primary-foreground">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-primary-foreground/70">
            Active pass
          </p>
          <p className="mt-1.5 text-[20px] font-bold tracking-[-0.02em]">
            {active.passName}
          </p>
          <p className="mt-1 text-[13px] text-primary-foreground/75">
            {active.unlimited
              ? "Unlimited rides"
              : `${active.usedCount} rides used`}
            {active.expiresAt
              ? ` · valid until ${new Date(
                  active.expiresAt
                ).toLocaleDateString([], { day: "numeric", month: "short" })}`
              : ""}
          </p>
        </Card>
      ) : (
        <Alert tone="info">
          No active pass. A valid pass covers fares automatically.
        </Alert>
      )}

      {list.length === 0 ? (
        <EmptyState
          title="No passes"
          hint="Passes you buy show up here."
        />
      ) : (
        list.map((p) => (
          <Card key={p._id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-semibold">{p.passName}</span>
              <Badge tone={p.status === "ACTIVE" ? "success" : "neutral"}>
                {p.status}
              </Badge>
            </div>
            <p className="tnum mt-1 text-[12.5px] text-muted-foreground">
              {p.currency} {p.price.toFixed(2)} · bought{" "}
              {new Date(p.purchasedAt).toLocaleDateString([], {
                day: "numeric",
                month: "short",
              })}
              {p.expiresAt
                ? ` · until ${new Date(p.expiresAt).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                  })}`
                : ""}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
