import * as complaintApi from "./complaint.api";
import type { Complaint, ComplaintInput } from "./complaint.types";

export const getAllComplaints = async (): Promise<Complaint[]> => {
  const res = await complaintApi.getAll();
  return res.data ?? [];
};

export const getComplaintById = async (
  id: string
): Promise<Complaint | null> => {
  const res = await complaintApi.getById(id);
  return res.data ?? null;
};

export const createComplaint = async (
  payload: ComplaintInput
): Promise<Complaint | null> => {
  const res = await complaintApi.create(payload);
  return res.data ?? null;
};

export const updateComplaint = async (
  id: string,
  payload: Partial<ComplaintInput>
): Promise<Complaint | null> => {
  const res = await complaintApi.update(id, payload);
  return res.data ?? null;
};

export const deleteComplaint = async (id: string): Promise<boolean> => {
  const res = await complaintApi.remove(id);
  return res.success;
};
