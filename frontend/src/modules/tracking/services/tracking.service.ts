import { api } from "@/utils/apiClient";
import type { LiveVehicle } from "@/store/slices/liveVehicles.slice";

interface RestLocation {
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
}
interface VehicleSnapshot {
  vehicleId: string;
  location: RestLocation | null;
  status: Record<string, string> | null;
  eta: { seconds?: number; etaSeconds?: number } | null;
  occupancy: { level?: string } | null;
  currentStop: { _id: string } | null;
}

const toLive = (s: VehicleSnapshot): LiveVehicle | null => {
  const loc = s.location;
  const lat = loc?.lat ?? loc?.latitude;
  const lng = loc?.lon ?? loc?.longitude;
  if (lat == null || lng == null) return null;
  return {
    vehicleId: s.vehicleId,
    lat,
    lng,
    speed: loc?.speed,
    heading: loc?.heading,
    status: s.status?.status ?? s.status?.state,
    routeId: s.status?.routeId ?? null,
    tripId: s.status?.tripId ?? null,
    currentStopId: s.currentStop?._id ?? s.status?.currentStopId ?? null,
    etaSeconds: s.eta?.seconds ?? s.eta?.etaSeconds ?? null,
    occupancyLevel: s.occupancy?.level ?? null,
    updatedAt: loc?.timestamp ?? Date.now(),
  };
};

/** GET /api/v1/tracking/route/:id -> vehicle ids on the route. */
export const getRouteVehicleIds = async (
  routeId: string
): Promise<string[]> => {
  const res = await api.get<{ routeId: string; vehicles: string[] }>(
    `/tracking/route/${routeId}`
  );
  return res.data?.vehicles ?? [];
};

/** GET /api/v1/tracking/vehicle/:id -> normalised LiveVehicle (or null if no state). */
export const getVehicleSnapshot = async (
  vehicleId: string
): Promise<LiveVehicle | null> => {
  try {
    const res = await api.get<VehicleSnapshot>(
      `/tracking/vehicle/${vehicleId}`
    );
    return res.data ? toLive(res.data) : null;
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
};

/** Hydrate every vehicle currently on a route. */
export const getRouteLiveVehicles = async (
  routeId: string
): Promise<LiveVehicle[]> => {
  const ids = await getRouteVehicleIds(routeId);
  const settled = await Promise.allSettled(ids.map(getVehicleSnapshot));
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<LiveVehicle | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((v): v is LiveVehicle => v != null);
};

/** GET /api/v1/tracking/trip/:id -> { tripId, vehicleId, location, status, eta } */
export const getTripSnapshot = async (
  tripId: string
): Promise<LiveVehicle | null> => {
  try {
    const res = await api.get<{
      tripId: string;
      vehicleId: string;
      location: RestLocation | null;
      status: Record<string, string> | null;
      eta: { seconds?: number } | null;
    }>(`/tracking/trip/${tripId}`);
    if (!res.data?.vehicleId) return null;
    return toLive({
      vehicleId: res.data.vehicleId,
      location: res.data.location,
      status: res.data.status,
      eta: res.data.eta,
      occupancy: null,
      currentStop: null,
    });
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
};
