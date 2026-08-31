import { publishEvent } from "../event-bus.service.js";
import { setDriverSOS } from "./driver-status.service.js";
import { getIO } from "../../../config/socket.js";
import { AuditLog } from "../../../models/auditLog.model.js";
import logger from "../../../utils/logger.js";

export interface SOSPayload {
  vehicleId: string;
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  message?: string;
  timestamp: number;
}

export const triggerSOS = async (payload: SOSPayload): Promise<{ traceId: string }> => {
  const { vehicleId, tripId, driverId, latitude, longitude, message, timestamp } = payload;

  logger.error(`SOS triggered by driver ${driverId}`, {
    driverId,
    vehicleId,
    tripId,
    latitude,
    longitude,
  });

  await setDriverSOS(driverId, vehicleId);

  const io = getIO();
  const sosData = {
    vehicleId,
    tripId,
    driverId,
    location: { lat: latitude, lng: longitude },
    message: message || "Emergency SOS",
    timestamp,
  };

  io?.to("fleet:all").emit("driver:sos", sosData);

  const traceId = await publishEvent("DRIVER_SOS", {
    vehicleId,
    tripId,
    routeId: "",
    driverId,
    location: { lat: latitude, lng: longitude },
    timestamp,
  });

  await AuditLog.create({
    actorId: driverId,
    actorRole: "DRIVER",
    action: "SOS_TRIGGERED",
    resource: "tracking",
    resourceId: vehicleId,
    meta: { tripId, latitude, longitude, message },
    severity: "SECURITY",
  }).catch((err: Error) => {
    logger.error(`Failed to create SOS audit log: ${err.message}`);
  });

  return { traceId };
};

export const acknowledgeSOS = async (
  dispatcherId: string,
  vehicleId: string,
  driverId: string
): Promise<void> => {
  const io = getIO();
  const vehicleRoom = `vehicle:${vehicleId}`;
  io?.to(vehicleRoom).emit("sos:acknowledged", {
    vehicleId,
    driverId,
    acknowledgedBy: dispatcherId,
    timestamp: Date.now(),
  });

  logger.info(`SOS acknowledged by dispatcher ${dispatcherId} for vehicle ${vehicleId}`, {
    dispatcherId,
    vehicleId,
    driverId,
  });
};
