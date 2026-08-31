import type { Socket } from "socket.io-client";
import logger from "../../utils/logger";

// NOTE: placeholder scaffold. The real-time layer is rebuilt in the tracking
// module against the as-built backend protocol (subscribe / unsubscribe + rooms).
interface VehicleLocationEvent {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
}

export const handleVehicleLocation = (socket: Socket): void => {
  socket.on("vehicle:location", (location: VehicleLocationEvent) => {
    logger.info(`vehicle:location received for ${location.vehicleId}`);
  });
};
