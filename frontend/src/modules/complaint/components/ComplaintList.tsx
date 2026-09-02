"use client";

import Link from "next/link";
import { FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { CATEGORY_LABEL, type ComplaintStatus } from "../constant/complaint.types";
import { useMyComplaints } from "../hooks/useComplaints";

const STATUS_CLASS: Record<ComplaintStatus, string> = {
  OPEN: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  ESCALATED: "bg-destructive/10 text-destructive",
  RESOLVED: "bg-success/10 text-success",
  CLOSED: "bg-muted text-muted-foreground",
};

export function ComplaintList() {
  const { data, isLoading, error } = useMyComplaints();

  if (isLoading) return <FullScreenLoader />;
  if (error)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error)}</Alert>
      </div>
    );

  const complaints = data?.complaints ?? [];
  if (complaints.length === 0)
    return (
      <EmptyState
        title="No complaints yet"
        hint="Report a problem with a bus, driver, or route and track it here."
      />
    );

  return (
    <ul className="divide-y">
      {complaints.map((c) => (
        <li key={c._id}>
          <Link href={`/complaints/${c._id}`} className="block p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {CATEGORY_LABEL[c.category] ?? c.category}
              </span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                  (STATUS_CLASS[c.status] ?? "bg-muted text-muted-foreground")
                }
              >
                {c.status.replace("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium">{c.subject}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {c.description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(c.createdAt).toLocaleString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
