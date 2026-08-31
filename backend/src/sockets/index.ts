import { Server as SocketIOServer, Socket } from "socket.io";
import { initSocket, broadcastToVehicle, broadcastToRoute, broadcastToTrip, broadcastToFleetAll } from "../config/socket.js";
import type { AuthenticatedSocket } from "../config/socket.js";
import logger from "../utils/logger.js";

export const registerSocketHandlers = (io: SocketIOServer): void => {
  logger.info("Socket handlers registered with Redis adapter");
};

export { initSocket, broadcastToVehicle, broadcastToRoute, broadcastToTrip, broadcastToFleetAll };
export type { AuthenticatedSocket };