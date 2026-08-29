import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { INCIDENT_ROUTES } from "./incident.routes";
import type { Incident, IncidentInput } from "./incident.types";

export const getAll = (): Promise<ApiResponse<Incident[]>> =>
  apiClient<Incident[]>(INCIDENT_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Incident>> =>
  apiClient<Incident>(INCIDENT_ROUTES.getById(id));

export const create = (
  payload: IncidentInput
): Promise<ApiResponse<Incident>> =>
  apiClient<Incident>(INCIDENT_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<IncidentInput>
): Promise<ApiResponse<Incident>> =>
  apiClient<Incident>(INCIDENT_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(INCIDENT_ROUTES.remove(id), { method: "DELETE" });
