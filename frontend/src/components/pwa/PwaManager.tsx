"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/register";
import { flushOutbox } from "@/lib/offline/outbox";
import { syncAllRefData } from "@/lib/offline/refCache";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";

/**
 * Client-only PWA glue, mounted once in the root layout:
 *  - registers the service worker (prod only)
 *  - flushes the offline write queue on reconnect and on SW `flush-outbox` pings
 *  - refreshes the offline reference-data mirror (routes/stops/…) on load + reconnect
 *  - renders the install prompt and the offline/pending status strip
 */
export function PwaManager() {
  useEffect(() => {
    registerServiceWorker();

    const kick = () => {
      flushOutbox();
      syncAllRefData().then(() =>
        window.dispatchEvent(new CustomEvent("refdata:change"))
      );
    };

    // Initial reference-data sync (best effort; silent if offline).
    syncAllRefData().then(() =>
      window.dispatchEvent(new CustomEvent("refdata:change"))
    );

    const onOnline = () => kick();
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === "flush-outbox") flushOutbox();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        flushOutbox();
      }
    };

    window.addEventListener("online", onOnline);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
    </>
  );
}
