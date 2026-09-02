export const CONDUCTOR_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
] as const;
export type ConductorStatus = (typeof CONDUCTOR_STATUSES)[number];

export const SHIFT_TYPES = ["MORNING", "EVENING", "NIGHT", "SPLIT"] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export interface ConductorShift {
  type: ShiftType;
  start?: string | null;
  end?: string | null;
}

export interface ConductorAttendance {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
}

export interface Conductor {
  _id: string;
  user: string;
  name: string;
  phone: string | null;
  employeeId: string;
  joiningDate: string | null;
  status: ConductorStatus;
  shift: ConductorShift;
  assigned: {
    vehicleId: string | null;
    routeId: string | null;
    scheduleId: string | null;
  };
  attendance: ConductorAttendance[];
  ticketSales: number;
  revenueCollected: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConductorInput {
  user: string;
  name: string;
  phone?: string | null;
  employeeId: string;
  joiningDate?: string | null;
  status?: ConductorStatus;
  shift?: ConductorShift;
}

export interface ConductorListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ConductorStatus;
}
