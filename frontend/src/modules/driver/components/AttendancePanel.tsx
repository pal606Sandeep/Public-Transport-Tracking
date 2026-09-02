"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useCheckIn, useCheckOut } from "../hooks/useDriver";

export function AttendancePanel() {
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [msg, setMsg] = useState<string | null>(null);
  const err = checkIn.error || checkOut.error;

  return (
    <section className="rounded-[var(--radius-app)] border p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Attendance
      </h2>
      {err && (
        <Alert tone="error" className="mt-2">
          {errorMessage(err)}
        </Alert>
      )}
      {msg && (
        <Alert tone="success" className="mt-2">
          {msg}
        </Alert>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          fullWidth
          loading={checkIn.isPending}
          onClick={async () => {
            setMsg(null);
            const r = await checkIn.mutateAsync();
            setMsg(`Checked in at ${new Date(r.checkIn).toLocaleTimeString()}`);
          }}
        >
          Check in
        </Button>
        <Button
          size="sm"
          variant="secondary"
          fullWidth
          loading={checkOut.isPending}
          onClick={async () => {
            setMsg(null);
            const r = await checkOut.mutateAsync();
            setMsg(`Checked out · ${r.workedMinutes} min worked`);
          }}
        >
          Check out
        </Button>
      </div>
    </section>
  );
}
