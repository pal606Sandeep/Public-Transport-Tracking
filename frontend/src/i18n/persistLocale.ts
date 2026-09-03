import { LOCALE_COOKIE } from "./config";

/**
 * Persist the chosen language and reload so the server picks it up in
 * `src/i18n/request.ts`. Kept out of components — assigning `document.cookie`
 * is a plain side effect, not React state.
 */
export function persistLocale(locale: string): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
