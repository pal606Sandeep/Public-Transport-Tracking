"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/config/env.config";
import {
  Button,
  FullScreenLoader,
  Alert,
  Card,
  Badge,
  Textarea,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { CATEGORY_LABEL, type ComplaintStatus } from "../constant/complaint.types";
import { useComplaint, useComplaintFeedback } from "../hooks/useComplaints";

const ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

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
    <div className="flex flex-col gap-4 p-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-medium text-muted-foreground">
            {CATEGORY_LABEL[c.category] ?? c.category}
          </span>
          <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>
            {c.status.replace("_", " ")}
          </Badge>
        </div>
        <h2 className="mt-1.5 text-[19px] font-bold tracking-[-0.01em]">
          {c.subject}
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Filed {new Date(c.createdAt).toLocaleString()} · Priority{" "}
          {c.priority.toLowerCase()}
          {c.escalationLevel > 0 ? ` · escalated ×${c.escalationLevel}` : ""}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">
          {c.description}
        </p>

        {c.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {c.attachments.map((a) => (
              <a
                key={a.key}
                href={`${ORIGIN}/uploads/${a.key}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-3 py-1.5 text-[12.5px] font-medium text-accent"
              >
                View attachment
              </a>
            ))}
          </div>
        )}
      </Card>

      {c.resolution?.note && (
        <Card className="border-[var(--success)]/30 bg-[var(--success)]/[0.07] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--success)]">
            Resolution
          </p>
          <p className="mt-1 text-[14px] leading-relaxed">{c.resolution.note}</p>
        </Card>
      )}

      {canRate && (
        <Card className="p-4">
          <p className="text-[15px] font-semibold">How was this handled?</p>
          {feedback.isSuccess ? (
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              Thanks for your feedback.
            </p>
          ) : (
            <>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                    aria-pressed={n <= rating}
                    onClick={() => setRating(n)}
                    className={
                      "text-2xl leading-none " +
                      (n <= rating ? "text-[color:var(--warning)]" : "text-border")
                    }
                  >
                    ★
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Anything else? (optional)"
                className="mt-3"
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
        </Card>
      )}
    </div>
  );
}
