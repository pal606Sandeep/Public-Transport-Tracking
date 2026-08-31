import length from "@turf/length";
import lineSlice from "@turf/line-slice";
import pointToLineDistance from "@turf/point-to-line-distance";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import bearing from "@turf/bearing";
import { point, lineString } from "@turf/helpers";
import type { Position } from "geojson";
import { Route } from "../../../modules/route/route.model.js";
import { Stop } from "../../../modules/stop/stop.model.js";
import logger from "../../../utils/logger.js";

type LineStringFeature = ReturnType<typeof lineString>;

export interface CachedRoute {
  routeId: string;
  geometry: LineStringFeature;
  stops: Array<{
    stopId: string;
    sequence: number;
    scheduledOffsetMinutes: number;
    lat: number;
    lng: number;
  }>;
  totalDistanceKm: number;
  loadedAt: number;
}

const routeCache = new Map<string, CachedRoute>();
const ROUTE_CACHE_TTL = 60_000;

export const loadRouteCache = async (routeId: string): Promise<CachedRoute | null> => {
  const existing = routeCache.get(routeId);
  if (existing && Date.now() - existing.loadedAt < ROUTE_CACHE_TTL) {
    return existing;
  }

  const route = await Route.findById(routeId).lean();
  if (!route || !route.geometry || route.geometry.coordinates.length < 2) {
    return null;
  }

  const coords: Position[] = route.geometry.coordinates.map((c) => [c[0], c[1]]);

  const stopIds = route.orderedStops.map((s) => s.stopId);
  const stopsDocs = await Stop.find({ _id: { $in: stopIds } }).lean();
  const stopMap = new Map(stopsDocs.map((s) => [s._id.toString(), s]));

  const stops = route.orderedStops
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => {
      const stopDoc = stopMap.get(s.stopId.toString());
      return {
        stopId: s.stopId.toString(),
        sequence: s.sequence,
        scheduledOffsetMinutes: s.scheduledOffsetMinutes,
        lat: stopDoc?.location.coordinates[1] ?? 0,
        lng: stopDoc?.location.coordinates[0] ?? 0,
      };
    });

  const geometry = lineString(coords);
  const totalDistanceKm = Number(length(geometry, { units: "kilometers" }));

  const cached: CachedRoute = {
    routeId,
    geometry,
    stops,
    totalDistanceKm,
    loadedAt: Date.now(),
  };

  routeCache.set(routeId, cached);
  return cached;
};

export const invalidateRouteCache = (routeId: string): void => {
  routeCache.delete(routeId);
};

export const getDistanceAlongRoute = (
  geometry: LineStringFeature,
  lat: number,
  lng: number
): number => {
  const pt = point([lng, lat]);

  try {
    const startCoord = geometry.geometry.coordinates[0] as Position;
    const startPt = point([startCoord[0], startCoord[1]]);
    // Distance from the route's start to the point snapped onto the line —
    // NOT distance to the end (lineSlice(a, b, line) is order-sensitive
    // about which portion of the line it returns).
    const sliced = lineSlice(startPt, pt, geometry);
    return length(sliced, { units: "meters" });
  } catch {
    return 0;
  }
};

export const getDistanceToRoute = (
  geometry: LineStringFeature,
  lat: number,
  lng: number
): number => {
  const pt = point([lng, lat]);
  return pointToLineDistance(pt, geometry, { units: "meters" });
};

export const getNearestPointOnRoute = (
  geometry: LineStringFeature,
  lat: number,
  lng: number
): { lat: number; lng: number; distance: number } => {
  const pt = point([lng, lat]);
  const nearest = nearestPointOnLine(geometry, pt);
  const coords = nearest.geometry.coordinates as Position;
  return {
    lat: coords[1],
    lng: coords[0],
    distance: (nearest.properties as { dist?: number }).dist ?? 0,
  };
};

export const getDistanceBetweenPoints = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const pt1 = point([lng1, lat1]);
  const pt2 = point([lng2, lat2]);
  const line = lineString([[lng1, lat1], [lng2, lat2]]);
  return length(line, { units: "meters" });
};

export const getBearing = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const pt1 = point([lng1, lat1]);
  const pt2 = point([lng2, lat2]);
  return bearing(pt1, pt2);
};

export const getStopAlongRoute = (
  geometry: LineStringFeature,
  stops: Array<{ lat: number; lng: number; sequence: number; stopId: string }>,
  vehicleLat: number,
  vehicleLng: number
): {
  previous: typeof stops[number] | null;
  current: typeof stops[number] | null;
  next: typeof stops[number] | null;
  distanceToNext: number;
  distanceFromPrevious: number;
  distanceAlongRouteMeters: number;
} => {
  const vehiclePt = point([vehicleLng, vehicleLat]);
  const totalLengthMeters = length(geometry, { units: "meters" });

  const vehicleDistMeters = getDistanceAlongRoute(geometry, vehicleLat, vehicleLng);

  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

  let currentIdx = -1;
  let minDist = Infinity;

  for (let i = 0; i < sortedStops.length; i++) {
    const stop = sortedStops[i];
    const stopPt = point([stop.lng, stop.lat]);
    const dist = pointToLineDistance(stopPt, geometry, { units: "meters" });
    const stopDistAlong = getDistanceAlongRoute(geometry, stop.lat, stop.lng);
    const diff = Math.abs(stopDistAlong - vehicleDistMeters);

    if (diff < minDist) {
      minDist = diff;
      currentIdx = i;
    }
  }

  const current = currentIdx >= 0 ? sortedStops[currentIdx] : null;
  const previous = currentIdx > 0 ? sortedStops[currentIdx - 1] : null;
  const next = currentIdx < sortedStops.length - 1 ? sortedStops[currentIdx + 1] : null;

  let distanceToNext = 0;
  if (next) {
    const nextDist = getDistanceAlongRoute(geometry, next.lat, next.lng);
    distanceToNext = Math.max(0, nextDist - vehicleDistMeters);
  }

  let distanceFromPrevious = 0;
  if (previous) {
    const prevDist = getDistanceAlongRoute(geometry, previous.lat, previous.lng);
    distanceFromPrevious = Math.max(0, vehicleDistMeters - prevDist);
  }

  return {
    previous,
    current,
    next,
    distanceToNext,
    distanceFromPrevious,
    distanceAlongRouteMeters: vehicleDistMeters,
  };
};

export const clearRouteCache = (): void => {
  routeCache.clear();
};
