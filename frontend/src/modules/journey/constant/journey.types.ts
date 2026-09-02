export interface StopBrief {
  _id: string;
  name: string;
  code: string | null;
  location: { lng: number; lat: number } | null;
  address: string | null;
  distanceMeters?: number;
}

export interface RouteBrief {
  _id: string;
  routeNumber: string;
  name: string | null;
  direction: string | null;
  source: { _id: string; name: string | null; code: string | null } | null;
  destination: { _id: string; name: string | null; code: string | null } | null;
  distanceKm: number | null;
  estimatedDurationMin: number | null;
  stopCount: number;
  status: string;
}

export interface JourneyLeg {
  mode: "walk" | "ride";
  routeId?: string;
  routeNumber?: string;
  fromStopId?: string;
  toStopId?: string;
  fromStopName?: string;
  toStopName?: string;
  distanceMeters?: number;
  durationMinutes: number;
  fare: number;
  nextDeparture?: number | null;
  liveEtaSeconds?: number | null;
}

export interface JourneyOption {
  transfers: number;
  legs: JourneyLeg[];
  transferPoints: { stopId: string; stopName: string | null }[];
  totalDurationMinutes: number;
  totalFare: number;
}

export interface JourneyResult {
  query: { from: StopBrief; to: StopBrief; time: number };
  walkingDistanceToFirstStopMeters: number;
  options: JourneyOption[];
}

/** a chosen endpoint — either a stop or a raw coordinate */
export type Endpoint =
  | { kind: "stop"; stop: StopBrief }
  | { kind: "coords"; lat: number; lng: number; label: string };

export const endpointToParam = (e: Endpoint): string =>
  e.kind === "stop" ? e.stop._id : `${e.lat},${e.lng}`;

export const endpointLabel = (e: Endpoint): string =>
  e.kind === "stop" ? e.stop.name : e.label;
