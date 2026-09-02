"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Textarea, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useStops } from "@/modules/stop/hooks/useStops";
import {
  ALERT_SEVERITIES,
  ALERT_TYPES,
  type AlertSeverity,
  type AlertType,
  type ServiceAlert,
  type ServiceAlertInput,
} from "../serviceAlert.types";

type TargetType = "all" | "routes" | "stops";

const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export function ServiceAlertForm({
  alert,
  submitting,
  error,
  submitLabel,
  onSubmit,
}: {
  alert?: ServiceAlert;
  submitting: boolean;
  error?: unknown;
  submitLabel: string;
  onSubmit: (input: ServiceAlertInput, publishNow: boolean) => void;
}) {
  const routesQ = useRoutes({ page: 1, limit: 200 });
  const stopsQ = useStops({ page: 1, limit: 200 });

  const [title, setTitle] = useState(alert?.title ?? "");
  const [message, setMessage] = useState(alert?.message ?? "");
  const [severity, setSeverity] = useState<AlertSeverity>(
    alert?.severity ?? "MEDIUM"
  );
  const [type, setType] = useState<AlertType>(alert?.type ?? "disruption");
  const [startsAt, setStartsAt] = useState(
    toLocalInput(alert?.startsAt) || toLocalInput(new Date().toISOString())
  );
  const [endsAt, setEndsAt] = useState(toLocalInput(alert?.endsAt));
  const [targetType, setTargetType] = useState<TargetType>(
    (alert?.targeting.type as TargetType) ?? "all"
  );
  const [routeIds, setRouteIds] = useState<string[]>(
    alert?.targeting.routeIds ?? []
  );
  const [stopIds, setStopIds] = useState<string[]>(
    alert?.targeting.stopIds ?? []
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const toggle = (arr: string[], id: string): string[] =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const build = (): ServiceAlertInput | null => {
    setLocalError(null);
    if (title.trim().length === 0 || message.trim().length === 0) {
      setLocalError("Title and message are required.");
      return null;
    }
    if (targetType === "routes" && routeIds.length === 0) {
      setLocalError("Select at least one route.");
      return null;
    }
    if (targetType === "stops" && stopIds.length === 0) {
      setLocalError("Select at least one stop.");
      return null;
    }
    const targeting =
      targetType === "routes"
        ? { type: "routes" as const, routeIds }
        : targetType === "stops"
          ? { type: "stops" as const, stopIds }
          : { type: "all" as const };

    return {
      title: title.trim(),
      message: message.trim(),
      severity,
      type,
      targeting,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    };
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}
      {localError && <Alert tone="error">{localError}</Alert>}

      <Field label="Title" required>
        {(p) => (
          <Input
            {...p}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>

      <Field label="Message" required>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          {(p) => (
            <Select
              {...p}
              value={type}
              onChange={(e) => setType(e.target.value as AlertType)}
            >
              {ALERT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Severity">
          {(p) => (
            <Select
              {...p}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
            >
              {ALERT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at" required>
          {(p) => (
            <Input
              {...p}
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          )}
        </Field>
        <Field label="Ends at">
          {(p) => (
            <Input
              {...p}
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Target">
        {(p) => (
          <Select
            {...p}
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as TargetType)}
          >
            <option value="all">Whole network</option>
            <option value="routes">Specific routes</option>
            <option value="stops">Specific stops</option>
          </Select>
        )}
      </Field>

      {targetType === "routes" && (
        <div className="max-h-48 overflow-y-auto rounded-[var(--radius-app)] border p-2">
          {(routesQ.data?.routes ?? []).map((r) => (
            <label
              key={r._id}
              className="flex items-center gap-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={routeIds.includes(r._id)}
                onChange={() => setRouteIds((a) => toggle(a, r._id))}
              />
              {r.routeNumber}
              {r.name ? ` — ${r.name}` : ""}
            </label>
          ))}
        </div>
      )}

      {targetType === "stops" && (
        <div className="max-h-48 overflow-y-auto rounded-[var(--radius-app)] border p-2">
          {(stopsQ.data?.stops ?? []).map((s) => (
            <label
              key={s._id}
              className="flex items-center gap-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={stopIds.includes(s._id)}
                onChange={() => setStopIds((a) => toggle(a, s._id))}
              />
              {s.name}
              {s.code ? ` (${s.code})` : ""}
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          loading={submitting}
          onClick={() => {
            const input = build();
            if (input) onSubmit(input, false);
          }}
        >
          {submitLabel}
        </Button>
        {!alert && (
          <Button
            variant="outline"
            loading={submitting}
            onClick={() => {
              const input = build();
              if (input) onSubmit({ ...input, status: "PUBLISHED" }, true);
            }}
          >
            Save &amp; publish
          </Button>
        )}
      </div>
    </div>
  );
}
