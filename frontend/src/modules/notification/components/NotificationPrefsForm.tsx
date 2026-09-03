"use client";

import { FullScreenLoader, Alert, Card, Button } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useNotificationPrefs, useUpdatePrefs } from "../hooks/useNotifications";
import { useWebPush } from "../hooks/useWebPush";

type ChannelKey = "inApp" | "webpush" | "sms" | "email";

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  inApp: "In-app",
  webpush: "Browser push",
  sms: "SMS",
  email: "Email",
};

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

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

      <section>
        <SectionLabel>Channels</SectionLabel>
        <Card className="divide-y overflow-hidden">
          {(Object.keys(CHANNEL_LABELS) as ChannelKey[]).map((k) => (
            <label
              key={k}
              className="flex items-center justify-between px-4 py-3.5 text-[15px]"
            >
              <span>{CHANNEL_LABELS[k]}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={prefs.channels[k]}
                onChange={(e) => setChannel(k, e.target.checked)}
              />
            </label>
          ))}
        </Card>
      </section>

      <section>
        <SectionLabel>Browser push</SectionLabel>
        {!push.capable ? (
          <p className="text-[13.5px] text-muted-foreground">
            This browser doesn&apos;t support push notifications.
          </p>
        ) : !push.hasVapidKey ? (
          <p className="text-[13.5px] text-muted-foreground">
            Push isn&apos;t configured on the server yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant={push.subscribed ? "secondary" : "primary"}
              size="lg"
              fullWidth
              loading={push.busy}
              onClick={() =>
                push.subscribed ? push.unsubscribe() : push.subscribe()
              }
            >
              {push.subscribed
                ? "Turn off push on this device"
                : "Enable push on this device"}
            </Button>
            {push.permission === "denied" && (
              <p className="text-[12.5px] text-muted-foreground">
                Notifications are blocked in your browser settings.
              </p>
            )}
            {push.error && (
              <p className="text-[12.5px] text-destructive">{push.error}</p>
            )}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Quiet hours</SectionLabel>
        <Card className="flex items-center gap-2 p-3">
          <input
            type="time"
            aria-label="Quiet hours start"
            value={prefs.quietHours.start ?? ""}
            onChange={(e) => setQuiet("start", e.target.value)}
            className="h-11 flex-1 rounded-[var(--radius-app-sm)] border bg-background px-3 text-[14px]"
          />
          <span className="text-[13.5px] text-muted-foreground">to</span>
          <input
            type="time"
            aria-label="Quiet hours end"
            value={prefs.quietHours.end ?? ""}
            onChange={(e) => setQuiet("end", e.target.value)}
            className="h-11 flex-1 rounded-[var(--radius-app-sm)] border bg-background px-3 text-[14px]"
          />
        </Card>
        <p className="mt-1.5 px-1 text-[12.5px] text-muted-foreground">
          Non-urgent notifications are held until quiet hours end.
        </p>
      </section>

      <Card className="overflow-hidden">
        <label className="flex items-center justify-between px-4 py-3.5 text-[15px]">
          <span>Daily digest instead of individual alerts</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--accent)]"
            checked={prefs.digest}
            onChange={(e) => update.mutate({ digest: e.target.checked })}
          />
        </label>
      </Card>
    </div>
  );
}
