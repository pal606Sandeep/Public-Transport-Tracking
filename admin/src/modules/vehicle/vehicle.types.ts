import type { VehicleStatus } from "../../constants/vehicleStatus";

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  model?: string;
  type: string;
  capacity: number;
  fuelType?: string;
  gpsDeviceId?: string;
  wheelchairAccessible?: boolean;
  status: VehicleStatus | string;
  assignedDriver?: string;
  assignedConductor?: string;
  assignedRoute?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleInput {
  registrationNumber: string;
  model?: string;
  type: string;
  capacity: number;
  fuelType?: string;
  gpsDeviceId?: string;
  wheelchairAccessible?: boolean;
  status?: string;
  assignedDriver?: string;
  assignedConductor?: string;
  assignedRoute?: string;
}
