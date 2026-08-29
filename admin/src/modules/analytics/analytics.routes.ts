const BASE = "/analytics";

export const ANALYTICS_ROUTES = {
  overview: (): string => `${BASE}/overview`,
  passengers: (): string => `${BASE}/passengers`,
  vehicles: (): string => `${BASE}/vehicles`,
  drivers: (): string => `${BASE}/drivers`,
  routes: (): string => `${BASE}/routes`,
  revenue: (): string => `${BASE}/revenue`,
};
