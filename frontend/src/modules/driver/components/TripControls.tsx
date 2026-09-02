"use client";

import { Button, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useTripAction } from "../hooks/useActiveTrip";

export function TripControls({
  tripId,
  status,
}: {
  tripId: string;
  status: string;
}) {
  const action = useTripAction();
  const busy = action.isPending;

  const run = (a: "pause" | "resume" | "end") => {
    if (a === "end" && !window.confirm("End this trip?")) return;
    action.mutate({ tripId, action: a });
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {action.isError && (
        <Alert tone="error">{errorMessage(action.error)}</Alert>
      )}
      <div className="flex gap-2">
        {status === "PAUSED" ? (
          <Button fullWidth loading={busy} onClick={() => run("resume")}>
            Resume trip
          </Button>
        ) : (
          <Button
            fullWidth
            variant="secondary"
            loading={busy}
            onClick={() => run("pause")}
          >
            Take a break
          </Button>
        )}
        <Button
          fullWidth
          variant="destructive"
          loading={busy}
          onClick={() => run("end")}
        >
          End trip
        </Button>
      </div>
    </div>
  );
}
