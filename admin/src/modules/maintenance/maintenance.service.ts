import { api } from "@/utils/apiClient";
import type { Pagination } from "@/types";
import type {
  MaintenanceRecord,
  MaintenanceInput,
  VehicleDocument,
  VehicleDocumentInput,
} from "./maintenance.types";

const M = (vehicleId: string) =>
  `/admin/maintenance/vehicles/${vehicleId}/maintenance`;
const D = (vehicleId: string) =>
  `/admin/maintenance/vehicles/${vehicleId}/documents`;

export async function listMaintenance(
  vehicleId: string,
  params: { page?: number; limit?: number; status?: string } = {}
): Promise<{ records: MaintenanceRecord[]; pagination: Pagination }> {
  const p = new URLSearchParams();
  p.set("page", String(params.page ?? 1));
  p.set("limit", String(params.limit ?? 50));
  if (params.status) p.set("status", params.status);
  const res = await api.get<{
    records: MaintenanceRecord[];
    pagination: Pagination;
  }>(`${M(vehicleId)}?${p.toString()}`);
  return {
    records: res.data?.records ?? [],
    pagination:
      res.data?.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 1 },
  };
}

export async function createMaintenance(
  vehicleId: string,
  input: MaintenanceInput
): Promise<MaintenanceRecord> {
  const res = await api.post<{ record: MaintenanceRecord }>(M(vehicleId), input);
  return (res.data as { record: MaintenanceRecord }).record;
}

export async function updateMaintenance(
  vehicleId: string,
  id: string,
  input: Partial<MaintenanceInput>
): Promise<MaintenanceRecord> {
  const res = await api.patch<{ record: MaintenanceRecord }>(
    `${M(vehicleId)}/${id}`,
    input
  );
  return (res.data as { record: MaintenanceRecord }).record;
}

export async function completeMaintenance(
  vehicleId: string,
  id: string
): Promise<MaintenanceRecord> {
  const res = await api.post<{ record: MaintenanceRecord }>(
    `${M(vehicleId)}/${id}/complete`
  );
  return (res.data as { record: MaintenanceRecord }).record;
}

export async function deleteMaintenance(
  vehicleId: string,
  id: string
): Promise<void> {
  await api.del(`${M(vehicleId)}/${id}`);
}

export async function listDocuments(
  vehicleId: string,
  params: { status?: string } = {}
): Promise<VehicleDocument[]> {
  const q = params.status ? `?status=${params.status}` : "";
  const res = await api.get<{ documents: VehicleDocument[] }>(
    `${D(vehicleId)}${q}`
  );
  return res.data?.documents ?? [];
}

export async function createDocument(
  vehicleId: string,
  input: VehicleDocumentInput
): Promise<VehicleDocument> {
  const res = await api.post<{ document: VehicleDocument }>(D(vehicleId), input);
  return (res.data as { document: VehicleDocument }).document;
}

export async function updateDocument(
  vehicleId: string,
  id: string,
  input: Partial<VehicleDocumentInput>
): Promise<VehicleDocument> {
  const res = await api.patch<{ document: VehicleDocument }>(
    `${D(vehicleId)}/${id}`,
    input
  );
  return (res.data as { document: VehicleDocument }).document;
}

export async function deleteDocument(
  vehicleId: string,
  id: string
): Promise<void> {
  await api.del(`${D(vehicleId)}/${id}`);
}
