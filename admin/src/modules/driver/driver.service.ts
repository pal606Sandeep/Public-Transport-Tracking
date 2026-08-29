import * as driverApi from "./driver.api";
import type { Driver, DriverInput } from "./driver.types";

export const getAllDrivers = async (): Promise<Driver[]> => {
  const res = await driverApi.getAll();
  return res.data ?? [];
};

export const getDriverById = async (
  id: string
): Promise<Driver | null> => {
  const res = await driverApi.getById(id);
  return res.data ?? null;
};

export const createDriver = async (
  payload: DriverInput
): Promise<Driver | null> => {
  const res = await driverApi.create(payload);
  return res.data ?? null;
};

export const updateDriver = async (
  id: string,
  payload: Partial<DriverInput>
): Promise<Driver | null> => {
  const res = await driverApi.update(id, payload);
  return res.data ?? null;
};

export const deleteDriver = async (id: string): Promise<boolean> => {
  const res = await driverApi.remove(id);
  return res.success;
};
