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
