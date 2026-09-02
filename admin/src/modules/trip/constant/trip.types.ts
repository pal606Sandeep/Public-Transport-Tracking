export const TRIP_STATUSES = [
  "SCHEDULED",
  "ASSIGNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "MISSED",
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export interface Trip {
  _id: string;
  schedule: string | null;
  route: string;
  vehicle: string | null;
  driver: string | null;
  conductor: string | null;
  status: TripStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  startTime: string | null;
  endTime: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  passengerSummary: unknown | null;
  reconciliation: unknown | null;
}

export interface CreateTripInput {
  route: string;
  schedule?: string | null;
  vehicle?: string | null;
  driver?: string | null;
  conductor?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
}

export interface AssignTripInput {
  driverId: string | null;
  vehicleId: string | null;
  conductorId: string | null;
}

export interface TripListParams {
  page?: number;
  limit?: number;
  status?: TripStatus;
  route?: string;
  driver?: string;
  dateFrom?: string;
  dateTo?: string;
}
