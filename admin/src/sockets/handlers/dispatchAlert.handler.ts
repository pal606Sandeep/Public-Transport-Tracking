import type { Socket } from "socket.io-client";
import logger from "../../utils/logger";

export interface DispatchAlertEvent {
  type: "driver:sos" | "route:deviation" | "vehicle:offline" | "gps:error";
  vehicleId?: string;
  driverId?: string;
  tripId?: string;
  routeId?: string;
  timestamp: number;
}

export const handleDispatchAlert = (socket: Socket): void => {
  socket.on("driver:sos", (event: DispatchAlertEvent) => {
    logger.warn(`SOS from driver ${event.driverId ?? "unknown"}`);
  });

  socket.on("route:deviation", (event: DispatchAlertEvent) => {
    logger.warn(`route deviation on ${event.routeId ?? "unknown"}`);
  });

  socket.on("vehicle:offline", (event: DispatchAlertEvent) => {
    logger.warn(`vehicle offline: ${event.vehicleId ?? "unknown"}`);
  });
};

export const acknowledgeSos = (socket: Socket, tripId: string): void => {
  socket.emit("sos:acknowledge", { tripId });
};
