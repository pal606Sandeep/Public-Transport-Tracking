import * as maintenanceApi from "./maintenance.api";
import type { MaintenanceRecord, MaintenanceRecordInput } from "./maintenance.types";

export const getAllMaintenanceRecords = async (): Promise<MaintenanceRecord[]> => {
  const res = await maintenanceApi.getAll();
  return res.data ?? [];
};

export const getMaintenanceRecordById = async (
  id: string
): Promise<MaintenanceRecord | null> => {
  const res = await maintenanceApi.getById(id);
  return res.data ?? null;
};

export const createMaintenanceRecord = async (
  payload: MaintenanceRecordInput
): Promise<MaintenanceRecord | null> => {
  const res = await maintenanceApi.create(payload);
  return res.data ?? null;
};

export const updateMaintenanceRecord = async (
  id: string,
  payload: Partial<MaintenanceRecordInput>
): Promise<MaintenanceRecord | null> => {
  const res = await maintenanceApi.update(id, payload);
  return res.data ?? null;
};

export const deleteMaintenanceRecord = async (id: string): Promise<boolean> => {
  const res = await maintenanceApi.remove(id);
  return res.success;
};
