const BASE = "/trips";
const ADMIN_BASE = "/admin/trips";

export const TRIP_ROUTES = {
  getAll: (): string => `${BASE}`,
  getById: (id: string): string => `${BASE}/${id}`,
  create: (): string => `${BASE}`,
  update: (id: string): string => `${BASE}/${id}`,
  remove: (id: string): string => `${BASE}/${id}`,
  cancel: (id: string): string => `${ADMIN_BASE}/${id}/cancel`,
  forceEnd: (id: string): string => `${ADMIN_BASE}/${id}/force-end`,
  summary: (id: string): string => `${BASE}/${id}/summary`,
};
