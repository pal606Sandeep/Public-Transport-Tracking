const BASE = "/incidents";

export const INCIDENT_ROUTES = {
  getAll: (): string => `${BASE}`,
  getById: (id: string): string => `${BASE}/${id}`,
  create: (): string => `${BASE}`,
  update: (id: string): string => `${BASE}/${id}`,
  remove: (id: string): string => `${BASE}/${id}`,
};
