import { LOCALE_COOKIE } from "./config";

/**
 * Persist the chosen language in the cookie `src/i18n/request.ts` reads on the
 * server. The caller re-renders server components (router.refresh) instead of
 * reloading the page, so in-memory auth state survives the switch.
 */
export function persistLocale(locale: string): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
