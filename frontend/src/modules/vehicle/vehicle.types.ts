import type { VehicleStatus } from "../../constants/vehicleStatus";

export interface Vehicle {
  _id: string;
  registrationNumber: string;
  type: string;
  capacity: number;
  status: VehicleStatus | string;
  assignedDriver?: string;
  assignedRoute?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleInput {
  registrationNumber: string;
  type: string;
  capacity: number;
  status?: string;
  assignedDriver?: string;
  assignedRoute?: string;
}
