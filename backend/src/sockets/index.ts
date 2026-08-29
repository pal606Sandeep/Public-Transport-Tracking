import { Server as SocketIOServer, Socket } from "socket.io";
import logger from "../utils/logger.js";
import { handleVehicleLocation } from "./handlers/vehicleLocation.handler.js";
import { handleDriverStatus } from "./handlers/driverStatus.handler.js";

export const registerSocketHandlers = (io: SocketIOServer): void => {
  io.on("connection", (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    handleVehicleLocation(io, socket);
    handleDriverStatus(io, socket);

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};