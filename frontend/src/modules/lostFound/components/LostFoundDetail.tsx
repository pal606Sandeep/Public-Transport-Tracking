"use client";

import { API_BASE_URL } from "@/config/env.config";
import { FullScreenLoader, Alert, Card, Badge } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { STATUS_LABEL } from "../constant/lostFound.types";
import { useLostFoundItem } from "../hooks/useLostFound";

const ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

export function LostFoundDetail({ id }: { id: string }) {
  const { data: it, isLoading, error } = useLostFoundItem(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !it)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error) || "Not found"}</Alert>
      </div>
    );

  const facts: [string, string][] = [
    ...(it.category ? ([["Category", it.category]] as [string, string][]) : []),
    ...(it.color ? ([["Colour", it.color]] as [string, string][]) : []),
    ...(it.reporterContact
      ? ([["Contact", it.reporterContact]] as [string, string][])
      : []),
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={it.kind === "FOUND" ? "success" : "accent"}>
            {it.kind}
          </Badge>
          <span className="text-[12.5px] text-muted-foreground">
            {STATUS_LABEL[it.status] ?? it.status}
          </span>
        </div>
        <h2 className="mt-1.5 text-[19px] font-bold tracking-[-0.01em]">
          {it.title}
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {new Date(it.occurredAt).toLocaleString()}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">
          {it.description}
        </p>

        {facts.length > 0 && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {it.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {it.attachments.map((a) => (
              <a
                key={a.key}
                href={`${ORIGIN}/uploads/${a.key}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-3 py-1.5 text-[12.5px] font-medium text-accent"
              >
                View photo
              </a>
            ))}
          </div>
        )}
      </Card>

      {it.resolution && (
        <Card className="border-[var(--success)]/30 bg-[var(--success)]/[0.07] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--success)]">
            Returned
          </p>
          {it.resolution.returnedTo && (
            <p className="mt-1 text-[14px]">Handed to {it.resolution.returnedTo}</p>
          )}
          {it.resolution.confirmedAt && (
            <p className="text-[12.5px] text-muted-foreground">
              {new Date(it.resolution.confirmedAt).toLocaleString()}
            </p>
          )}
          {it.resolution.note && (
            <p className="mt-1 text-[14px]">{it.resolution.note}</p>
          )}
        </Card>
      )}

      {it.history.length > 0 && (
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <ul className="mt-2 space-y-2.5">
            {it.history.map((h, i) => (
              <li key={i} className="flex gap-3 text-[13.5px]">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border"
                />
                <span className="min-w-0">
                  <span className="capitalize">
                    {h.action.replace(/_/g, " ")}
                  </span>
                  <span className="ml-2 text-[12px] text-muted-foreground">
                    {new Date(h.at).toLocaleString()}
                  </span>
                  {h.note && (
                    <span className="block text-[12.5px] text-muted-foreground">
                      {h.note}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
