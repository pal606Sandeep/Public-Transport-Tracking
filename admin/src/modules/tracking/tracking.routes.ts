const BASE = "/tracking";

export const TRACKING_ROUTES = {
  updateLocation: (vehicleId: string): string => `${BASE}/${vehicleId}/location`,
  getLocation: (vehicleId: string): string => `${BASE}/${vehicleId}/location`,
  getByRoute: (routeId: string): string => `${BASE}/route/${routeId}`,
  getByTrip: (tripId: string): string => `${BASE}/trip/${tripId}`,
  getTripHistory: (tripId: string): string => `${BASE}/trip/${tripId}/history`,
};
