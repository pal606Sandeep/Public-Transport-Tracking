"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES, LOCALE_LABEL } from "@/i18n/config";
import { persistLocale } from "@/i18n/persistLocale";

/**
 * Segmented language picker. Locale lives in a long-lived cookie that
 * `src/i18n/request.ts` reads on the server, so switching means "set cookie +
 * reload" — no client-side message swapping to keep in sync.
 */
export function LocaleSwitcher() {
  const active = useLocale();
  const t = useTranslations("profile");

  const choose = (loc: string) => {
    if (loc !== active) persistLocale(loc);
  };

  return (
    <section>
      <h3 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("language")}
      </h3>
      <div className="flex gap-1 rounded-full bg-muted p-1">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => choose(loc)}
            aria-pressed={loc === active}
            className={
              "flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors " +
              (loc === active
                ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground")
            }
          >
            {LOCALE_LABEL[loc]}
          </button>
        ))}
      </div>
    </section>
  );
}
