"use client";

import { useEffect } from "react";
import { applyTheme, readStoredTheme } from "@/lib/theme";

/**
 * Mounted once in the root layout. Re-applies the stored theme on hydration
 * (the inline boot script already did the no-flash pass) and keeps `system`
 * mode in step when the OS light/dark setting changes at runtime.
 */
export function ThemeManager() {
  useEffect(() => {
    applyTheme(readStoredTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onOsChange = () => {
      if (readStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onOsChange);
    return () => mq.removeEventListener("change", onOsChange);
  }, []);

  return null;
}
