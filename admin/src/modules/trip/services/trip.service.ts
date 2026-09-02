import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Trip,
  TripListParams,
  CreateTripInput,
  AssignTripInput,
  TripStatus,
} from "../constant/trip.types";

const BASE = "/admin/trips";

export async function listTrips(
  params: TripListParams = {}
): Promise<{ trips: Trip[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.status) p.set("status", params.status);
  if (params.route) p.set("route", params.route);
  if (params.driver) p.set("driver", params.driver);
  if (params.dateFrom) p.set("dateFrom", params.dateFrom);
  if (params.dateTo) p.set("dateTo", params.dateTo);
  const res = await api.get<{ trips: Trip[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    trips: res.data?.trips ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getTrip(id: string): Promise<Trip> {
  const res = await api.get<{ trip: Trip }>(`${BASE}/${id}`);
  return (res.data as { trip: Trip }).trip;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(BASE, input);
  return (res.data as { trip: Trip }).trip;
}

export async function assignTrip(
  id: string,
  input: AssignTripInput
): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(`${BASE}/${id}/assign`, input);
  return (res.data as { trip: Trip }).trip;
}

export async function transitionTrip(
  id: string,
  status: TripStatus
): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(`${BASE}/${id}/transition`, {
    status,
  });
  return (res.data as { trip: Trip }).trip;
}

export async function cancelTrip(id: string, reason: string): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(`${BASE}/${id}/cancel`, { reason });
  return (res.data as { trip: Trip }).trip;
}

export async function missTrip(id: string): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(`${BASE}/${id}/miss`);
  return (res.data as { trip: Trip }).trip;
}

export async function completeTrip(id: string): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(`${BASE}/${id}/complete`);
  return (res.data as { trip: Trip }).trip;
}

export async function forceEndTrip(id: string): Promise<Trip> {
  const res = await api.post<{ trip: Trip }>(`${BASE}/${id}/force-end`);
  return (res.data as { trip: Trip }).trip;
}
