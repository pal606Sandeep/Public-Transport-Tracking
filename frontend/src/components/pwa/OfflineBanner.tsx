"use client";

import { useOnline } from "@/lib/offline/useOnline";
import { useOutboxCount } from "@/lib/offline/outbox";

/**
 * Slim status strip pinned under the top safe-area. Appears only when offline,
 * or briefly while queued writes are still pending after reconnect.
 */
export function OfflineBanner() {
  const online = useOnline();
  const pending = useOutboxCount();

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-50 mx-auto max-w-md px-3"
      style={{ top: "calc(0.4rem + var(--safe-t))" }}
    >
      <div
        className={
          "rounded-full px-3.5 py-1.5 text-center text-[12px] font-semibold shadow-[var(--shadow-md)] " +
          (online
            ? "bg-[var(--success)] text-white"
            : "bg-foreground text-background")
        }
      >
        {online
          ? `Back online — syncing ${pending} change${pending === 1 ? "" : "s"}…`
          : pending > 0
            ? `Offline — ${pending} change${pending === 1 ? "" : "s"} will send when you reconnect`
            : "You're offline — showing saved data"}
      </div>
    </div>
  );
}
