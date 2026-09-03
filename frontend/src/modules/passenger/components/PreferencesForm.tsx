"use client";

import { useEffect } from "react";
import { Alert, Card, Skeleton } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { applyTheme, type ThemePref } from "@/lib/theme";
import { usePassengerProfile, useUpdatePreferences } from "../hooks/usePassenger";
import type { PassengerNotificationPrefs } from "../constant/passenger.types";

const THEMES = ["system", "light", "dark"] as const;

export function PreferencesForm() {
  const { data: profile, isLoading } = usePassengerProfile();
  const update = useUpdatePreferences();

  // The server profile is the cross-device source of truth: mirror it onto this
  // device whenever it loads or changes elsewhere.
  const serverTheme = profile?.preferences.theme;
  useEffect(() => {
    if (serverTheme) applyTheme(serverTheme);
  }, [serverTheme]);

  if (isLoading || !profile) {
    return <Skeleton className="h-44 w-full" />;
  }

  const prefs = profile.preferences;

  const chooseTheme = (t: ThemePref) => {
    applyTheme(t); // instant, optimistic
    update.mutate({ theme: t });
  };

  const setNotif = (key: keyof PassengerNotificationPrefs, value: boolean) =>
    update.mutate({ notifications: { [key]: value } });

  return (
    <div className="flex flex-col gap-5">
      {update.isError && (
        <Alert tone="error">{errorMessage(update.error)}</Alert>
      )}

      <section>
        <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </h3>
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => chooseTheme(t)}
              aria-pressed={prefs.theme === t}
              className={
                "flex-1 rounded-full py-2 text-[13px] font-semibold capitalize transition-colors " +
                (prefs.theme === t
                  ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                  : "text-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notifications
        </h3>
        <Card className="divide-y overflow-hidden">
          {(
            [
              ["serviceAlerts", "Service alerts & disruptions"],
              ["favourites", "Favourite routes & stops"],
              ["promotions", "Promotions"],
            ] as [keyof PassengerNotificationPrefs, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between px-4 py-3.5 text-[15px]"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--accent)]"
                checked={prefs.notifications?.[key] ?? false}
                onChange={(e) => setNotif(key, e.target.checked)}
              />
            </label>
          ))}
        </Card>
      </section>
    </div>
  );
}
