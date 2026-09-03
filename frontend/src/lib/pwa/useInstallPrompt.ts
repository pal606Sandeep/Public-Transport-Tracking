"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

const readInstalled = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

/**
 * Captures Chrome/Edge's `beforeinstallprompt` so we can show our own install
 * button at a moment that makes sense (Safari/iOS never fires it — the UI
 * falls back to text instructions there).
 */
export function useInstallPrompt() {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(readInstalled);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = deferred.current;
    if (!evt) return "unavailable" as const;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    deferred.current = null;
    setCanInstall(false);
    return outcome;
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  }, []);

  const isIOS =
    typeof navigator !== "undefined" &&
    /ipad|iphone|ipod/i.test(navigator.userAgent);

  return {
    /** the OS-native mini-infobar is available */
    canInstall,
    /** already running as an installed app */
    installed,
    /** the user closed our banner before */
    dismissed,
    isIOS,
    promptInstall,
    dismiss,
  };
}
