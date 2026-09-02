import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Driver,
  DriverInput,
  DriverListParams,
  DriverStatus,
} from "../constant/driver.types";

const BASE = "/admin/drivers";

export async function listDrivers(
  params: DriverListParams = {}
): Promise<{ drivers: Driver[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (params.status) p.set("status", params.status);
  const res = await api.get<{ drivers: Driver[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    drivers: res.data?.drivers ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getDriver(id: string): Promise<Driver> {
  const res = await api.get<{ driver: Driver }>(`${BASE}/${id}`);
  return (res.data as { driver: Driver }).driver;
}

export async function createDriver(input: DriverInput): Promise<Driver> {
  const res = await api.post<{ driver: Driver }>(BASE, input);
  return (res.data as { driver: Driver }).driver;
}

export async function updateDriver(
  id: string,
  input: Partial<DriverInput>
): Promise<Driver> {
  const res = await api.patch<{ driver: Driver }>(`${BASE}/${id}`, input);
  return (res.data as { driver: Driver }).driver;
}

export async function setDriverStatus(
  id: string,
  status: DriverStatus
): Promise<void> {
  await api.post(`${BASE}/${id}/status`, { status });
}

export async function assignDriver(
  id: string,
  body: {
    vehicleId: string | null;
    routeId: string | null;
    scheduleId: string | null;
  }
): Promise<Driver> {
  const res = await api.post<{ driver: Driver }>(`${BASE}/${id}/assign`, body);
  return (res.data as { driver: Driver }).driver;
}

export async function deleteDriver(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
