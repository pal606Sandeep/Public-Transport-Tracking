const BASE = "/auth";

export const AUTH_ROUTES = {
  register: (): string => `${BASE}/register`,
  login: (): string => `${BASE}/login`,
  refreshToken: (): string => `${BASE}/refresh-token`,
};
