"use client";

import { API_BASE_URL } from "@/config/env.config";
import { FullScreenLoader, Alert } from "@/components/ui";
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

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {it.kind}
          </span>
          <span className="text-xs text-muted-foreground">
            {STATUS_LABEL[it.status] ?? it.status}
          </span>
        </div>
        <h2 className="mt-1 text-lg font-semibold">{it.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(it.occurredAt).toLocaleString()}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm">{it.description}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {it.category && (
          <>
            <dt className="text-muted-foreground">Category</dt>
            <dd>{it.category}</dd>
          </>
        )}
        {it.color && (
          <>
            <dt className="text-muted-foreground">Colour</dt>
            <dd>{it.color}</dd>
          </>
        )}
        {it.reporterContact && (
          <>
            <dt className="text-muted-foreground">Contact</dt>
            <dd>{it.reporterContact}</dd>
          </>
        )}
      </dl>

      {it.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {it.attachments.map((a) => (
            <a
              key={a.key}
              href={`${ORIGIN}/uploads/${a.key}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[var(--radius-app)] border px-3 py-2 text-xs text-primary"
            >
              View photo
            </a>
          ))}
        </div>
      )}

      {it.resolution && (
        <div className="rounded-[var(--radius-app)] border border-success/40 bg-success/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">
            Returned
          </p>
          {it.resolution.returnedTo && (
            <p className="mt-1 text-sm">Handed to {it.resolution.returnedTo}</p>
          )}
          {it.resolution.confirmedAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(it.resolution.confirmedAt).toLocaleString()}
            </p>
          )}
          {it.resolution.note && (
            <p className="mt-1 text-sm">{it.resolution.note}</p>
          )}
        </div>
      )}

      {it.history.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <ul className="mt-2 space-y-2">
            {it.history.map((h, i) => (
              <li key={i} className="text-sm">
                <span className="capitalize">
                  {h.action.replace(/_/g, " ")}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(h.at).toLocaleString()}
                </span>
                {h.note && (
                  <p className="text-xs text-muted-foreground">{h.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
