"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRequestAssignment } from "../hooks/useDriver";

export function RequestAssignmentForm() {
  const router = useRouter();
  const req = useRequestAssignment();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="p-4">
        <Alert tone="success">
          Request sent to dispatch. You&apos;ll see the assignment once approved.
        </Alert>
        <Button
          className="mt-4"
          fullWidth
          variant="secondary"
          onClick={() => router.replace("/driver")}
        >
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await req.mutateAsync({ date, reason: reason || undefined });
        setDone(true);
      }}
    >
      {req.isError && <Alert tone="error">{errorMessage(req.error)}</Alert>}

      <Field label="Date" required>
        {(p) => (
          <Input
            {...p}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
      </Field>

      <Field label="Reason" hint="Optional — helps the dispatcher">
        {(p) => (
          <Input
            {...p}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. covering an absent colleague"
          />
        )}
      </Field>

      <Button type="submit" fullWidth loading={req.isPending}>
        Send request
      </Button>
    </form>
  );
}
