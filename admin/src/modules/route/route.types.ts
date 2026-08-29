export interface RouteStopRef {
  stopId: string;
  sequence: number;
  scheduledOffsetMinutes?: number;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface Route {
  _id: string;
  name: string;
  routeNumber: string;
  startStop?: string;
  endStop?: string;
  stops: RouteStopRef[];
  geometry?: RouteGeometry;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  direction?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteInput {
  name: string;
  routeNumber: string;
  startStop?: string;
  endStop?: string;
  stops?: RouteStopRef[];
  geometry?: RouteGeometry;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  direction?: string;
  isActive?: boolean;
}
