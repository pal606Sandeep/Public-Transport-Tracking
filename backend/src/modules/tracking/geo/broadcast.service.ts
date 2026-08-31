import { broadcastToVehicle, broadcastToRoute, broadcastToTrip, broadcastToFleetAll } from "../../../config/socket.js";
import logger from "../../../utils/logger.js";

export interface VehicleBroadcastData {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status?: string;
  currentStopId?: string | null;
  nextStopId?: string | null;
  eta?: number;
  delayStatus?: string;
  occupancyLevel?: string;
  lastUpdate: number;
  timestamp: number;
}

export const broadcastVehicleLocation = async (data: VehicleBroadcastData): Promise<void> => {
  const { vehicleId, tripId, routeId } = data;

  const roomData = {
    ...data,
    lastUpdate: Date.now(),
  };

  broadcastToVehicle(vehicleId, "vehicle:location", roomData);

  if (routeId) {
    broadcastToRoute(routeId, "vehicle:location", roomData);
  }

  if (tripId) {
    broadcastToTrip(tripId, "vehicle:location", roomData);
  }

  broadcastToFleetAll("vehicle:location", roomData);

  logger.debug(`Broadcast vehicle location: ${vehicleId}`, {
    vehicleId,
    routeId,
    tripId,
  });
};

export const broadcastVehicleStatus = (
  vehicleId: string,
  status: string,
  routeId?: string,
  tripId?: string
): void => {
  const data = { vehicleId, status, timestamp: Date.now() };

  broadcastToVehicle(vehicleId, "vehicle:status", data);
  if (routeId) broadcastToRoute(routeId, "vehicle:status", data);
  if (tripId) broadcastToTrip(tripId, "vehicle:status", data);
  broadcastToFleetAll("vehicle:status", data);
};

export const broadcastGeofenceEvent = (
  eventType: string,
  vehicleId: string,
  routeId: string,
  tripId: string,
  stopId: string,
  data: Record<string, unknown>
): void => {
  const payload = { vehicleId, routeId, tripId, stopId, ...data, timestamp: Date.now() };

  broadcastToVehicle(vehicleId, eventType, payload);
  broadcastToRoute(routeId, eventType, payload);
  broadcastToTrip(tripId, eventType, payload);
  broadcastToFleetAll(eventType, payload);
};

export const broadcastDelayStatus = (
  vehicleId: string,
  tripId: string,
  routeId: string,
  delayStatus: string,
  delaySeconds: number
): void => {
  const data = { vehicleId, tripId, routeId, delayStatus, delaySeconds, timestamp: Date.now() };

  broadcastToVehicle(vehicleId, "vehicle:delay", data);
  broadcastToRoute(routeId, "vehicle:delay", data);
  broadcastToTrip(tripId, "vehicle:delay", data);
  broadcastToFleetAll("vehicle:delay", data);
};

export const broadcastRouteDeviation = (
  vehicleId: string,
  tripId: string,
  routeId: string,
  deviationData: Record<string, unknown>
): void => {
  const data = { vehicleId, tripId, routeId, ...deviationData, timestamp: Date.now() };

  broadcastToVehicle(vehicleId, "route:deviation", data);
  broadcastToRoute(routeId, "route:deviation", data);
  broadcastToTrip(tripId, "route:deviation", data);
  broadcastToFleetAll("route:deviation", data);
};
