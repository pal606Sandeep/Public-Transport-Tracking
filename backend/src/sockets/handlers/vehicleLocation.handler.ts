import { Server as SocketIOServer, Socket } from "socket.io";
import logger from "../../utils/logger.js";

export const handleVehicleLocation = (
  io: SocketIOServer,
  socket: Socket
): void => {
  socket.on("join-route", (data: { routeId?: string; vehicleId?: string }) => {
    const roomId = data?.vehicleId ? `vehicle:${data.vehicleId}` : data?.routeId
      ? `route:${data.routeId}`
      : undefined;

    if (!roomId) {
      socket.emit("error", { message: "routeId or vehicleId is required" });
      return;
    }

    socket.join(roomId);
    logger.info(`Socket ${socket.id} joined room ${roomId}`);
    socket.emit("joined-room", { room: roomId });
  });
};