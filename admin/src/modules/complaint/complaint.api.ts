import { apiClient } from "../../utils/apiClient";
import type { ApiResponse } from "../../types";
import { COMPLAINT_ROUTES } from "./complaint.routes";
import type { Complaint, ComplaintInput } from "./complaint.types";

export const getAll = (): Promise<ApiResponse<Complaint[]>> =>
  apiClient<Complaint[]>(COMPLAINT_ROUTES.getAll());

export const getById = (id: string): Promise<ApiResponse<Complaint>> =>
  apiClient<Complaint>(COMPLAINT_ROUTES.getById(id));

export const create = (
  payload: ComplaintInput
): Promise<ApiResponse<Complaint>> =>
  apiClient<Complaint>(COMPLAINT_ROUTES.create(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const update = (
  id: string,
  payload: Partial<ComplaintInput>
): Promise<ApiResponse<Complaint>> =>
  apiClient<Complaint>(COMPLAINT_ROUTES.update(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const remove = (id: string): Promise<ApiResponse<null>> =>
  apiClient<null>(COMPLAINT_ROUTES.remove(id), { method: "DELETE" });
