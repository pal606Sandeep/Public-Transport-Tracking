"use client";

import { FullScreenLoader, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useNotificationPrefs,
  useUpdatePrefs,
} from "../hooks/useNotifications";
import { useWebPush } from "../hooks/useWebPush";

type ChannelKey = "inApp" | "webpush" | "sms" | "email";

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  inApp: "In-app",
  webpush: "Browser push",
  sms: "SMS",
  email: "Email",
};

export function NotificationPrefsForm() {
  const { data: prefs, isLoading, error } = useNotificationPrefs();
  const update = useUpdatePrefs();
  const push = useWebPush();

  if (isLoading || !prefs) {
    if (error)
      return (
        <div className="p-4">
          <Alert tone="error">{errorMessage(error)}</Alert>
        </div>
      );
    return <FullScreenLoader />;
  }

  const setChannel = (k: ChannelKey, v: boolean) =>
    update.mutate({ channels: { [k]: v } });

  const setQuiet = (which: "start" | "end", value: string) =>
    update.mutate({
      quietHours: { ...prefs.quietHours, [which]: value || null },
    });

  return (
    <div className="flex flex-col gap-6 p-4">
      {update.isError && (
        <Alert tone="error">{errorMessage(update.error)}</Alert>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Channels
        </h3>
        {(Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((k) => (
          <label
            key={k}
            className="flex items-center justify-between rounded-[var(--radius-app)] border px-3 py-3 text-sm"
          >
            <span>{CHANNEL_LABELS[k]}</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={prefs.channels[k]}
              onChange={(e) => setChannel(k, e.target.checked)}
            />
          </label>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Browser push
        </h3>
        {!push.capable ? (
          <p className="text-sm text-muted-foreground">
            This browser doesn&apos;t support push notifications.
          </p>
        ) : !push.hasVapidKey ? (
          <p className="text-sm text-muted-foreground">
            Push isn&apos;t configured on the server yet.
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={push.busy}
              onClick={() =>
                push.subscribed ? push.unsubscribe() : push.subscribe()
              }
              className={
                "rounded-[var(--radius-app)] px-4 py-2.5 text-sm font-medium " +
                (push.subscribed
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground")
              }
            >
              {push.busy
                ? "Working…"
                : push.subscribed
                  ? "Turn off push on this device"
                  : "Enable push on this device"}
            </button>
            {push.permission === "denied" && (
              <p className="text-xs text-muted-foreground">
                Notifications are blocked in your browser settings.
              </p>
            )}
            {push.error && (
              <p className="text-xs text-destructive">{push.error}</p>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quiet hours
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={prefs.quietHours.start ?? ""}
            onChange={(e) => setQuiet("start", e.target.value)}
            className="h-11 flex-1 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="time"
            value={prefs.quietHours.end ?? ""}
            onChange={(e) => setQuiet("end", e.target.value)}
            className="h-11 flex-1 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Non-urgent notifications are held until quiet hours end.
        </p>
      </section>

      <label className="flex items-center justify-between rounded-[var(--radius-app)] border px-3 py-3 text-sm">
        <span>Daily digest instead of individual alerts</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--primary)]"
          checked={prefs.digest}
          onChange={(e) => update.mutate({ digest: e.target.checked })}
        />
      </label>
    </div>
  );
}
