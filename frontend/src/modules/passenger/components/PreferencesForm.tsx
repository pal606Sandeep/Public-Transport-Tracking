"use client";

import { Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { usePassengerProfile, useUpdatePreferences } from "../hooks/usePassenger";
import type { PassengerNotificationPrefs } from "../constant/passenger.types";

const THEMES = ["system", "light", "dark"] as const;

export function PreferencesForm() {
  const { data: profile, isLoading } = usePassengerProfile();
  const update = useUpdatePreferences();

  if (isLoading || !profile) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-app)] bg-muted" />;
  }

  const prefs = profile.preferences;

  const setNotif = (key: keyof PassengerNotificationPrefs, value: boolean) =>
    update.mutate({ notifications: { [key]: value } });

  return (
    <div className="flex flex-col gap-6">
      {update.isError && (
        <Alert tone="error">{errorMessage(update.error)}</Alert>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </h3>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update.mutate({ theme: t })}
              aria-pressed={prefs.theme === t}
              className={
                "flex-1 rounded-[var(--radius-app)] border px-3 py-2 text-sm capitalize " +
                (prefs.theme === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notifications
        </h3>
        {(
          [
            ["serviceAlerts", "Service alerts & disruptions"],
            ["favourites", "Updates for favourite routes & stops"],
            ["promotions", "Promotions"],
          ] as [keyof PassengerNotificationPrefs, string][]
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center justify-between rounded-[var(--radius-app)] border px-3 py-3 text-sm"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={prefs.notifications?.[key] ?? false}
              onChange={(e) => setNotif(key, e.target.checked)}
            />
          </label>
        ))}
      </section>
    </div>
  );
}
