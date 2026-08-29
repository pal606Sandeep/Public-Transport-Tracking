import type { Socket } from "socket.io-client";
import logger from "../utils/logger";
import { handleFleetLocation } from "./handlers/fleetLocation.handler";
import { handleDispatchAlert } from "./handlers/dispatchAlert.handler";

export const registerSocketHandlers = (socket: Socket): void => {
  socket.on("connect", () => {
    logger.info(`Socket connected: ${socket.id}`);
  });

  handleFleetLocation(socket);
  handleDispatchAlert(socket);

  socket.on("disconnect", () => {
    logger.info("Socket disconnected");
  });
};
