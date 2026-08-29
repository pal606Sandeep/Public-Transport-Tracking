import { Server as SocketIOServer, Socket } from "socket.io";
import logger from "../../utils/logger.js";

const ADMIN_ROOM = "admin-dashboard";

export const handleDriverStatus = (
  io: SocketIOServer,
  socket: Socket
): void => {
  socket.on(
    "driver-status-update",
    (data: { driverId: string; status: string }) => {
      const statusUpdate = {
        driverId: data?.driverId,
        status: data?.status,
        timestamp: Date.now(),
      };

      io.to(ADMIN_ROOM).emit("driver-status-change", statusUpdate);
      logger.info(
        `Driver ${data?.driverId} status changed to ${data?.status}`
      );
    }
  );
};