import { Server as SocketIOServer, Socket } from "socket.io";
import { initSocket, AuthenticatedSocket, broadcastToVehicle, broadcastToRoute, broadcastToTrip, broadcastToFleetAll } from "../config/socket.js";
import logger from "../utils/logger.js";

export const registerSocketHandlers = (io: SocketIOServer): void => {
  logger.info("Socket handlers registered with Redis adapter");
};

export { initSocket, AuthenticatedSocket, broadcastToVehicle, broadcastToRoute, broadcastToTrip, broadcastToFleetAll };