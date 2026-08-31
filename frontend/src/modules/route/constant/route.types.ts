export interface GeoLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteStopEntry {
  stopId: string;
  sequence: number;
  scheduledOffsetMinutes: number;
  /** present when the backend populates the stop on a detail read */
  stop?: {
    _id: string;
    name: string;
    code?: string | null;
    location?: { type: "Point"; coordinates: [number, number] };
  } | null;
}

export interface Route {
  _id: string;
  routeNumber: string;
  name?: string | null;
  source?: string | null;
  destination?: string | null;
  distanceKm?: number | null;
  estimatedDurationMin?: number | null;
  geometry?: GeoLineString | null;
  direction?: string | null;
  status: "ACTIVE" | "INACTIVE";
  orderedStops: RouteStopEntry[];
  stops: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
}
