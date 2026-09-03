/**
 * Theme application — pure DOM/storage helpers, no React.
 *
 * The chosen preference lives in two places: the passenger's server profile
 * (source of truth across devices) and `localStorage` (so the inline boot
 * script in the root layout can apply it before first paint, no flash).
 *
 * `light`/`dark` set `<html data-theme>`; `system` removes it and lets the
 * `@media (prefers-color-scheme)` rules in globals.css take over.
 */

export type ThemePref = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

const THEME_COLOR = { light: "#111318", dark: "#0a0a0c" } as const;

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* private mode / disabled storage */
  }
  return "system";
}

export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;

  const el = document.documentElement;
  if (pref === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", pref);

  const resolved = resolveTheme(pref);
  el.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", THEME_COLOR[resolved]);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}
