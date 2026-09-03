"use client";

import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";

/**
 * A dismissible "Install Transit" card. Shows the native prompt on Chromium and
 * short Share-sheet instructions on iOS. Hidden once installed or dismissed.
 */
export function InstallPrompt() {
  const { canInstall, installed, dismissed, isIOS, promptInstall, dismiss } =
    useInstallPrompt();

  if (installed || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 mx-auto max-w-md px-3"
      style={{ bottom: "calc(4.75rem + var(--safe-b))" }}
      role="region"
      aria-label="Install this app"
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-app)] border bg-elevated p-3 shadow-[var(--shadow-lg)]">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-app-sm)] bg-primary text-primary-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold">Install Transit</p>
          <p className="text-[12px] leading-snug text-muted-foreground">
            {isIOS
              ? "Tap the Share button, then “Add to Home Screen”."
              : "Add it to your home screen for full-screen, offline access."}
          </p>
        </div>
        {canInstall && (
          <button
            type="button"
            onClick={promptInstall}
            className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-primary-foreground active:scale-95"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
