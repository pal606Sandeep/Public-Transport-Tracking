export interface Schedule {
  _id: string;
  route: string;
  vehicle: string;
  driver: string;
  departureTime: string;
  arrivalTime: string;
  dayOfWeek?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  route: string;
  vehicle: string;
  driver: string;
  departureTime: string;
  arrivalTime: string;
  dayOfWeek?: number;
  isActive?: boolean;
}
