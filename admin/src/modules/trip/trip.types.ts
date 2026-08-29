import type { TripStatus } from "../../constants/tripStatus";

export interface Trip {
  _id: string;
  route: string;
  vehicle: string;
  driver?: string;
  conductor?: string;
  schedule?: string;
  status: TripStatus | string;
  scheduledAt?: string;
  startTime?: string;
  endTime?: string;
  currentStop?: string;
  nextStop?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripInput {
  route: string;
  vehicle: string;
  driver?: string;
  conductor?: string;
  schedule?: string;
  status?: string;
  scheduledAt?: string;
}

export interface TripSummary {
  tripId: string;
  distanceKm: number;
  durationMinutes: number;
  stopsServed: number;
  onTime: boolean;
  delayMinutes: number;
  averageSpeed: number;
}
