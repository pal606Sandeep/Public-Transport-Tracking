import type { Socket } from "socket.io-client";
import logger from "../utils/logger";
import { handleVehicleLocation } from "./handlers/vehicleLocation.handler";
import { handleDriverStatus } from "./handlers/driverStatus.handler";

export const registerSocketHandlers = (socket: Socket): void => {
  socket.on("connect", () => {
    logger.info(`Socket connected: ${socket.id}`);
  });

  handleVehicleLocation(socket);
  handleDriverStatus(socket);

  socket.on("disconnect", () => {
    logger.info("Socket disconnected");
  });
};
