export interface GeoLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat][]
}

export interface RouteStopEntry {
  stopId: string;
  sequence: number;
  scheduledOffsetMinutes: number;
}

export type RouteStatus = "ACTIVE" | "INACTIVE";

export interface Route {
  _id: string;
  routeNumber: string;
  name: string | null;
  source: string | null;
  destination: string | null;
  distanceKm: number | null;
  estimatedDurationMin: number | null;
  geometry: GeoLineString | null;
  direction: string | null;
  status: RouteStatus;
  orderedStops: RouteStopEntry[];
  stops: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteInput {
  routeNumber: string;
  name?: string | null;
  source?: string | null;
  destination?: string | null;
  distanceKm?: number | null;
  estimatedDurationMin?: number | null;
  geometry?: GeoLineString | null;
  direction?: string | null;
  status?: RouteStatus;
  orderedStops?: RouteStopEntry[];
}

export interface RouteListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: RouteStatus;
}
