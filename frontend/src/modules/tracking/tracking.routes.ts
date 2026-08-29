const BASE = "/tracking";

export const TRACKING_ROUTES = {
  updateLocation: (vehicleId: string): string => `${BASE}/${vehicleId}/location`,
  getLocation: (vehicleId: string): string => `${BASE}/${vehicleId}/location`,
};
