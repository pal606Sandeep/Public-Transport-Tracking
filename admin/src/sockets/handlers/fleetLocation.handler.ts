import type { Socket } from "socket.io-client";
import logger from "../../utils/logger";
import type { VehicleLocation } from "../../modules/tracking/tracking.types";

export const handleFleetLocation = (socket: Socket): void => {
  socket.on("vehicle-location", (location: VehicleLocation) => {
    logger.info(`fleet vehicle-location for ${location.vehicleId}`);
  });

  socket.on("vehicle-status", (event: { vehicleId: string; status: string }) => {
    logger.info(`fleet vehicle-status for ${event.vehicleId}: ${event.status}`);
  });
};

export const joinFleet = (socket: Socket): void => {
  socket.emit("join-fleet", { room: "fleet:all" });
};
