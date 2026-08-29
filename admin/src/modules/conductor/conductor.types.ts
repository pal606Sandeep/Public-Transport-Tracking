export interface Conductor {
  _id: string;
  name: string;
  phone: string;
  employeeId?: string;
  joiningDate?: string;
  status: string;
  user?: string;
  assignedVehicle?: string;
  assignedRoute?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConductorInput {
  name: string;
  phone: string;
  employeeId?: string;
  joiningDate?: string;
  status?: string;
  user?: string;
  assignedVehicle?: string;
  assignedRoute?: string;
}
