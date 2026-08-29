import * as fareApi from "./fare.api";
import type { Fare, FareInput } from "./fare.types";

export const getAllFares = async (): Promise<Fare[]> => {
  const res = await fareApi.getAll();
  return res.data ?? [];
};

export const getFareById = async (
  id: string
): Promise<Fare | null> => {
  const res = await fareApi.getById(id);
  return res.data ?? null;
};

export const createFare = async (
  payload: FareInput
): Promise<Fare | null> => {
  const res = await fareApi.create(payload);
  return res.data ?? null;
};

export const updateFare = async (
  id: string,
  payload: Partial<FareInput>
): Promise<Fare | null> => {
  const res = await fareApi.update(id, payload);
  return res.data ?? null;
};

export const deleteFare = async (id: string): Promise<boolean> => {
  const res = await fareApi.remove(id);
  return res.success;
};
