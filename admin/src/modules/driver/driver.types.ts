export interface Driver {
  _id: string;
  name: string;
  phone: string;
  employeeId?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  joiningDate?: string;
  status: string;
  user?: string;
  assignedVehicle?: string;
  assignedRoute?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverInput {
  name: string;
  phone: string;
  employeeId?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  joiningDate?: string;
  status?: string;
  user?: string;
  assignedVehicle?: string;
  assignedRoute?: string;
}
