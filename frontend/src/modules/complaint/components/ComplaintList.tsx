"use client";

import { useSearchParams } from "next/navigation";
import { EmptyState, Alert, Card, Badge, SkeletonList } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  CATEGORY_LABEL,
  type ComplaintStatus,
} from "../constant/complaint.types";
import { useMyComplaints } from "../hooks/useComplaints";

const STATUS_TONE: Record<
  ComplaintStatus,
  "neutral" | "accent" | "danger" | "success"
> = {
  OPEN: "neutral",
  IN_PROGRESS: "accent",
  ESCALATED: "danger",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export function ComplaintList() {
  const { data, isLoading, error } = useMyComplaints();
  const queued = useSearchParams().get("queued") === "1";

  if (isLoading) return <SkeletonList rows={4} />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const queuedBanner = queued ? (
    <div className="px-4 pt-4">
      <Alert tone="success">
        Saved. Your complaint will be submitted automatically when you&apos;re
        back online.
      </Alert>
    </div>
  ) : null;

  const complaints = data?.complaints ?? [];
  if (complaints.length === 0)
    return (
      <>
        {queuedBanner}
        <EmptyState
          title="No complaints yet"
          hint="Report a problem with a bus, driver, or route and track it here."
        />
      </>
    );

  return (
    <>
      {queuedBanner}
      <div className="flex flex-col gap-3 p-4">
        {complaints.map((c) => (
        <Card
          key={c._id}
          href={`/complaints/${c._id}`}
          interactive
          className="p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">
              {CATEGORY_LABEL[c.category] ?? c.category}
            </span>
            <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>
              {c.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1.5 text-[15px] font-semibold">{c.subject}</p>
          <p className="mt-0.5 line-clamp-2 text-[13.5px] text-muted-foreground">
            {c.description}
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {new Date(c.createdAt).toLocaleDateString([], {
              day: "numeric",
              month: "short",
            })}
          </p>
          </Card>
        ))}
      </div>
    </>
  );
}
