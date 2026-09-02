/**
 * In-memory access token. Never persisted — a browser has no secure keystore.
 * The refresh token is an httpOnly cookie owned by the backend (path /api/v1/auth).
 */
let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
  listeners.forEach((fn) => fn(token));
};

export const onAccessTokenChange = (
  fn: (token: string | null) => void
): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
