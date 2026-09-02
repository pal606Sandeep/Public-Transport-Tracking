export const VEHICLE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
  "RETIRED",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
};

export interface VehicleRef {
  _id: string;
  name?: string;
  employeeId?: string;
  routeNumber?: string;
}

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  model: string | null;
  type: string;
  capacity: number;
  status: VehicleStatus;
  wheelchairAccessible: boolean;
  amenities: Record<string, unknown>;
  fuelType: string | null;
  gpsDeviceId: string | null;
  assignedDriver: VehicleRef | null;
  assignedConductor: VehicleRef | null;
  assignedRoute: VehicleRef | null;
  history?: unknown[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleInput {
  registrationNumber: string;
  model?: string | null;
  type: string;
  capacity: number;
  fuelType?: string | null;
  gpsDeviceId?: string | null;
  status?: VehicleStatus;
  assignedRoute?: string | null;
  wheelchairAccessible?: boolean;
}

export interface VehicleListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: VehicleStatus;
}
