import type { Socket } from "socket.io-client";
import logger from "../../utils/logger";
import type { VehicleLocation } from "../../modules/tracking/tracking.types";

export const handleVehicleLocation = (socket: Socket): void => {
  socket.on("vehicle-location", (location: VehicleLocation) => {
    logger.info(`vehicle-location received for ${location.vehicleId}`);
  });
};

export const joinRoute = (
  socket: Socket,
  data: { routeId?: string; vehicleId?: string }
): void => {
  socket.emit("join-route", data);
};
