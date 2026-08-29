export interface VehicleLocation {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  timestamp: number;
}

export interface UpdateLocationInput {
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
}

export interface GpsHistoryPoint {
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: number;
}

export interface TripHistory {
  tripId: string;
  vehicleId: string;
  points: GpsHistoryPoint[];
}
