export interface AnalyticsQuery {
  from?: string;
  to?: string;
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
}

export interface OverviewStats {
  totalVehicles: number;
  activeVehicles: number;
  offlineVehicles: number;
  drivers: number;
  conductors: number;
  routes: number;
  stops: number;
  passengersToday: number;
  tripsToday: number;
  openIncidents: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface AnalyticsSeries {
  metric: string;
  points: TimeSeriesPoint[];
}
