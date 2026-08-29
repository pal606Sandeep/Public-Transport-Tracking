import * as serviceAlertApi from "./serviceAlert.api";
import type { ServiceAlert, ServiceAlertInput } from "./serviceAlert.types";

export const getAllServiceAlerts = async (): Promise<ServiceAlert[]> => {
  const res = await serviceAlertApi.getAll();
  return res.data ?? [];
};

export const getServiceAlertById = async (
  id: string
): Promise<ServiceAlert | null> => {
  const res = await serviceAlertApi.getById(id);
  return res.data ?? null;
};

export const createServiceAlert = async (
  payload: ServiceAlertInput
): Promise<ServiceAlert | null> => {
  const res = await serviceAlertApi.create(payload);
  return res.data ?? null;
};

export const updateServiceAlert = async (
  id: string,
  payload: Partial<ServiceAlertInput>
): Promise<ServiceAlert | null> => {
  const res = await serviceAlertApi.update(id, payload);
  return res.data ?? null;
};

export const deleteServiceAlert = async (id: string): Promise<boolean> => {
  const res = await serviceAlertApi.remove(id);
  return res.success;
};
