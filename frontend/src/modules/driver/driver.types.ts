export interface Driver {
  _id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: string;
  user?: string;
  assignedVehicle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
  status?: string;
  user?: string;
  assignedVehicle?: string;
}
