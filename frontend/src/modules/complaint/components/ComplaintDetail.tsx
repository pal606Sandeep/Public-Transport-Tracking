"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/config/env.config";
import { Button, FullScreenLoader, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { CATEGORY_LABEL } from "../constant/complaint.types";
import { useComplaint, useComplaintFeedback } from "../hooks/useComplaints";

const ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

export function ComplaintDetail({ id }: { id: string }) {
  const { data: c, isLoading, error } = useComplaint(id);
  const feedback = useComplaintFeedback(id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (isLoading) return <FullScreenLoader />;
  if (error || !c)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error) || "Not found"}</Alert>
      </div>
    );

  const canRate = c.status === "RESOLVED" || c.status === "CLOSED";

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {CATEGORY_LABEL[c.category] ?? c.category}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {c.status.replace("_", " ")}
          </span>
        </div>
        <h2 className="mt-1 text-lg font-semibold">{c.subject}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Filed {new Date(c.createdAt).toLocaleString()} · Priority{" "}
          {c.priority.toLowerCase()}
          {c.escalationLevel > 0 ? ` · escalated ×${c.escalationLevel}` : ""}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm">{c.description}</p>

      {c.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {c.attachments.map((a) => (
            <a
              key={a.key}
              href={`${ORIGIN}/uploads/${a.key}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[var(--radius-app)] border px-3 py-2 text-xs text-primary"
            >
              View attachment
            </a>
          ))}
        </div>
      )}

      {c.resolution?.note && (
        <div className="rounded-[var(--radius-app)] border border-success/40 bg-success/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success">
            Resolution
          </p>
          <p className="mt-1 text-sm">{c.resolution.note}</p>
        </div>
      )}

      {canRate && (
        <div className="rounded-[var(--radius-app)] border p-4">
          <p className="text-sm font-medium">How was this handled?</p>
          {feedback.isSuccess ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks for your feedback.
            </p>
          ) : (
            <>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setRating(n)}
                    className={
                      "text-2xl leading-none " +
                      (n <= rating ? "text-[color:#f59e0b]" : "text-border")
                    }
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Anything else? (optional)"
                className="mt-3 w-full rounded-[var(--radius-app)] border bg-card p-3 text-sm"
              />
              {feedback.isError && (
                <Alert tone="error" className="mt-2">
                  {errorMessage(feedback.error)}
                </Alert>
              )}
              <Button
                className="mt-3"
                size="sm"
                loading={feedback.isPending}
                disabled={rating === 0}
                onClick={() =>
                  feedback.mutate({
                    rating,
                    comment: comment.trim() || undefined,
                  })
                }
              >
                Send feedback
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
