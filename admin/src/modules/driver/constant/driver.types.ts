export const DRIVER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const SHIFT_TYPES = ["MORNING", "EVENING", "NIGHT", "SPLIT"] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export interface DriverShift {
  type: ShiftType;
  start?: string | null;
  end?: string | null;
}

export interface DriverAttendance {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
}

export interface Driver {
  _id: string;
  user: string;
  name: string;
  phone: string | null;
  employeeId: string;
  licenseNumber: string;
  licenseType: string | null;
  licenseExpiry: string | null;
  joiningDate: string | null;
  status: DriverStatus;
  shift: DriverShift;
  assigned: {
    vehicleId: string | null;
    routeId: string | null;
    scheduleId: string | null;
  };
  attendance: DriverAttendance[];
  complaintsCount: number;
  performance: unknown | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverInput {
  user: string;
  name: string;
  phone?: string | null;
  employeeId: string;
  licenseNumber: string;
  licenseType?: string | null;
  licenseExpiry?: string | null;
  joiningDate?: string | null;
  status?: DriverStatus;
  shift?: DriverShift;
}

export interface DriverListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DriverStatus;
}
