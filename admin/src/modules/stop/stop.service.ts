import * as stopApi from "./stop.api";
import type { Stop, StopInput } from "./stop.types";

export const getAllStops = async (): Promise<Stop[]> => {
  const res = await stopApi.getAll();
  return res.data ?? [];
};

export const getStopById = async (
  id: string
): Promise<Stop | null> => {
  const res = await stopApi.getById(id);
  return res.data ?? null;
};

export const createStop = async (
  payload: StopInput
): Promise<Stop | null> => {
  const res = await stopApi.create(payload);
  return res.data ?? null;
};

export const updateStop = async (
  id: string,
  payload: Partial<StopInput>
): Promise<Stop | null> => {
  const res = await stopApi.update(id, payload);
  return res.data ?? null;
};

export const deleteStop = async (id: string): Promise<boolean> => {
  const res = await stopApi.remove(id);
  return res.success;
};
