import * as conductorApi from "./conductor.api";
import type { Conductor, ConductorInput } from "./conductor.types";

export const getAllConductors = async (): Promise<Conductor[]> => {
  const res = await conductorApi.getAll();
  return res.data ?? [];
};

export const getConductorById = async (
  id: string
): Promise<Conductor | null> => {
  const res = await conductorApi.getById(id);
  return res.data ?? null;
};

export const createConductor = async (
  payload: ConductorInput
): Promise<Conductor | null> => {
  const res = await conductorApi.create(payload);
  return res.data ?? null;
};

export const updateConductor = async (
  id: string,
  payload: Partial<ConductorInput>
): Promise<Conductor | null> => {
  const res = await conductorApi.update(id, payload);
  return res.data ?? null;
};

export const deleteConductor = async (id: string): Promise<boolean> => {
  const res = await conductorApi.remove(id);
  return res.success;
};
