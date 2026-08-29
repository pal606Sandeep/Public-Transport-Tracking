import * as tripApi from "./trip.api";
import type { Trip, TripInput, TripSummary } from "./trip.types";

export const getAllTrips = async (): Promise<Trip[]> => {
  const res = await tripApi.getAll();
  return res.data ?? [];
};

export const getTripById = async (id: string): Promise<Trip | null> => {
  const res = await tripApi.getById(id);
  return res.data ?? null;
};

export const createTrip = async (
  payload: TripInput
): Promise<Trip | null> => {
  const res = await tripApi.create(payload);
  return res.data ?? null;
};

export const updateTrip = async (
  id: string,
  payload: Partial<TripInput>
): Promise<Trip | null> => {
  const res = await tripApi.update(id, payload);
  return res.data ?? null;
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  const res = await tripApi.remove(id);
  return res.success;
};

export const cancelTrip = async (id: string): Promise<Trip | null> => {
  const res = await tripApi.cancel(id);
  return res.data ?? null;
};

export const forceEndTrip = async (id: string): Promise<Trip | null> => {
  const res = await tripApi.forceEnd(id);
  return res.data ?? null;
};

export const getTripSummary = async (
  id: string
): Promise<TripSummary | null> => {
  const res = await tripApi.getSummary(id);
  return res.data ?? null;
};
