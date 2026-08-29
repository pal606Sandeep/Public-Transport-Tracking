import { getDistanceInMeters } from "../../utils/distance.util";

export const isWithinGeofence = (
  vehicleLat: number,
  vehicleLon: number,
  stopLat: number,
  stopLon: number,
  radiusMeters: number
): boolean => {
  const distance = getDistanceInMeters(vehicleLat, vehicleLon, stopLat, stopLon);
  return distance <= radiusMeters;
};
