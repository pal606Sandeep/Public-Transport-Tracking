"use client";

import Link from "next/link";
import { FullScreenLoader, EmptyState, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { STATUS_LABEL } from "../constant/lostFound.types";
import { useMyLostFound } from "../hooks/useLostFound";

export function LostFoundList() {
  const { data, isLoading, error } = useMyLostFound();

  if (isLoading) return <FullScreenLoader />;
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
    <ul className="divide-y">
      {items.map((it) => (
        <li key={it._id}>
          <Link href={`/lost-found/${it._id}`} className="block p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                {it.kind}
              </span>
              <span className="text-xs text-muted-foreground">
                {STATUS_LABEL[it.status] ?? it.status}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium">{it.title}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {it.description}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(it.occurredAt).toLocaleString()}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
