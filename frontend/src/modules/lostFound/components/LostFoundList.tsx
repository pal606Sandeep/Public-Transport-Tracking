"use client";

import { EmptyState, Alert, Card, Badge, SkeletonList } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { STATUS_LABEL } from "../constant/lostFound.types";
import { useMyLostFound } from "../hooks/useLostFound";

export function LostFoundList() {
  const { data, isLoading, error } = useMyLostFound();

  if (isLoading) return <SkeletonList rows={4} />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const items = data?.items ?? [];
  if (items.length === 0)
    return (
      <EmptyState
        title="No reports yet"
        hint="Report a lost or found item and we'll try to match it."
      />
    );

  return (
    <div className="flex flex-col gap-3 p-4">
      {items.map((it) => (
        <Card
          key={it._id}
          href={`/lost-found/${it._id}`}
          interactive
          className="p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Badge tone={it.kind === "LOST" ? "danger" : "accent"}>
              {it.kind}
            </Badge>
            <span className="text-[12px] font-medium text-muted-foreground">
              {STATUS_LABEL[it.status] ?? it.status}
            </span>
          </div>
          <p className="mt-1.5 text-[15px] font-semibold">{it.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[13.5px] text-muted-foreground">
            {it.description}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {new Date(it.occurredAt).toLocaleDateString([], {
              day: "numeric",
              month: "short",
            })}
          </p>
        </Card>
      ))}
    </div>
  );
}
