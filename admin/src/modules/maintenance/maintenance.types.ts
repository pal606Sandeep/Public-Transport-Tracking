export interface MaintenanceRecord {
  _id: string;
  vehicle: string;
  type: string;
  description?: string;
  cost?: number;
  serviceDate?: string;
  nextServiceDate?: string;
  odometerKm?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecordInput {
  vehicle: string;
  type: string;
  description?: string;
  cost?: number;
  serviceDate?: string;
  nextServiceDate?: string;
  odometerKm?: number;
  status?: string;
}
