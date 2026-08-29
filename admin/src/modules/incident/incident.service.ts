import * as incidentApi from "./incident.api";
import type { Incident, IncidentInput } from "./incident.types";

export const getAllIncidents = async (): Promise<Incident[]> => {
  const res = await incidentApi.getAll();
  return res.data ?? [];
};

export const getIncidentById = async (
  id: string
): Promise<Incident | null> => {
  const res = await incidentApi.getById(id);
  return res.data ?? null;
};

export const createIncident = async (
  payload: IncidentInput
): Promise<Incident | null> => {
  const res = await incidentApi.create(payload);
  return res.data ?? null;
};

export const updateIncident = async (
  id: string,
  payload: Partial<IncidentInput>
): Promise<Incident | null> => {
  const res = await incidentApi.update(id, payload);
  return res.data ?? null;
};

export const deleteIncident = async (id: string): Promise<boolean> => {
  const res = await incidentApi.remove(id);
  return res.success;
};
