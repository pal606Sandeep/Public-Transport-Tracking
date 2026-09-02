import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  Vehicle,
  VehicleInput,
  VehicleListParams,
} from "../constant/vehicle.types";

const BASE = "/admin/vehicles";

export async function listVehicles(
  params: VehicleListParams = {}
): Promise<{ vehicles: Vehicle[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 20));
  if (params.search) p.set("search", params.search);
  if (params.status) p.set("status", params.status);
  const res = await api.get<{ vehicles: Vehicle[]; pagination: Pagination }>(
    `${BASE}?${p.toString()}`
  );
  return {
    vehicles: res.data?.vehicles ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const res = await api.get<{ vehicle: Vehicle }>(`${BASE}/${id}`);
  return (res.data as { vehicle: Vehicle }).vehicle;
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const res = await api.post<{ vehicle: Vehicle }>(BASE, input);
  return (res.data as { vehicle: Vehicle }).vehicle;
}

export async function updateVehicle(
  id: string,
  input: Partial<VehicleInput>
): Promise<Vehicle> {
  const res = await api.patch<{ vehicle: Vehicle }>(`${BASE}/${id}`, input);
  return (res.data as { vehicle: Vehicle }).vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.del(`${BASE}/${id}`);
}
