"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  CHECKLIST_ITEMS,
  type ChecklistInput,
  type ChecklistItem,
} from "../constant/driver.types";
import { useSubmitChecklist } from "../hooks/useActiveTrip";

const LABELS: Record<ChecklistItem, string> = {
  fuel: "Fuel level OK",
  tyres: "Tyres OK",
  brakes: "Brakes OK",
  lights: "Lights & indicators OK",
  documentsValid: "Documents valid",
  cleanliness: "Cabin & bus clean",
};

export function ChecklistForm({
  tripId,
  onDone,
}: {
  tripId: string;
  onDone: () => void;
}) {
  const submit = useSubmitChecklist();
  const [state, setState] = useState<ChecklistInput>({});

  const allAnswered = CHECKLIST_ITEMS.every((k) => state[k] !== undefined);
  const anyFailed = CHECKLIST_ITEMS.some((k) => state[k] === false);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">Pre-trip checklist</h2>
      {submit.isError && (
        <Alert tone="error">{errorMessage(submit.error)}</Alert>
      )}

      <ul className="divide-y rounded-[var(--radius-app)] border">
        {CHECKLIST_ITEMS.map((k) => (
          <li key={k} className="flex items-center justify-between px-3 py-3">
            <span className="text-sm">{LABELS[k]}</span>
            <div className="flex gap-1">
              {(
                [
                  ["OK", true],
                  ["Fail", false],
                ] as [string, boolean][]
              ).map(([label, val]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, [k]: val }))}
                  aria-pressed={state[k] === val}
                  className={
                    "rounded-[var(--radius-app)] border px-2.5 py-1 text-xs " +
                    (state[k] === val
                      ? val
                        ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                        : "border-destructive bg-destructive/10 text-destructive"
                      : "text-muted-foreground hover:bg-muted")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {anyFailed && (
        <Alert tone="error">
          Failed items may block the trip from starting.
        </Alert>
      )}

      <Button
        fullWidth
        disabled={!allAnswered}
        loading={submit.isPending}
        onClick={async () => {
          await submit.mutateAsync({ tripId, checklist: state });
          onDone();
        }}
      >
        Save checklist
      </Button>
    </div>
  );
}
