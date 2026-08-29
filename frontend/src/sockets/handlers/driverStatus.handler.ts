import type { Socket } from "socket.io-client";
import logger from "../../utils/logger";

export interface DriverStatusEvent {
  driverId: string;
  status: string;
}

export const handleDriverStatus = (socket: Socket): void => {
  socket.on("driver-status", (event: DriverStatusEvent) => {
    logger.info(`driver-status received for ${event.driverId}: ${event.status}`);
  });
};
