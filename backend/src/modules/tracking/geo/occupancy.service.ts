import { updateVehicleOccupancy, getVehicleOccupancy } from "../tracking.service.js";
import { publishEvent } from "../event-bus.service.js";
import { getIO } from "../../../config/socket.js";
import logger from "../../../utils/logger.js";

export type OccupancyLevel = "LOW" | "MODERATE" | "CROWDED";

export interface OccupancyResult {
  vehicleId: string;
  tripId: string;
  routeId: string;
  previousLevel: OccupancyLevel | null;
  currentLevel: OccupancyLevel;
  passengerCount: number;
  capacity: number;
  occupancyPercentage: number;
}

const LOW_THRESHOLD = 0.4;
const MODERATE_THRESHOLD = 0.75;

export const deriveOccupancyLevel = (
  passengerCount: number,
  capacity: number
): OccupancyLevel => {
  if (capacity <= 0) return "LOW";
  const ratio = passengerCount / capacity;
  if (ratio <= LOW_THRESHOLD) return "LOW";
  if (ratio <= MODERATE_THRESHOLD) return "MODERATE";
  return "CROWDED";
};

export const processOccupancyUpdate = async (
  vehicleId: string,
  tripId: string,
  routeId: string,
  passengerCount: number,
  capacity: number
): Promise<OccupancyResult> => {
  const currentLevel = deriveOccupancyLevel(passengerCount, capacity);
  const previous = await getVehicleOccupancy(vehicleId);
  const previousLevel = previous?.level ?? null;

  const occupancyPercentage = capacity > 0 ? Math.round((passengerCount / capacity) * 100) : 0;

  await updateVehicleOccupancy({
    vehicleId,
    tripId,
    passengerCount,
    capacity,
    level: currentLevel,
    updatedAt: Date.now(),
  });

  if (previousLevel !== currentLevel) {
    logger.info(`Occupancy changed for vehicle ${vehicleId}: ${previousLevel} → ${currentLevel}`, {
      vehicleId,
      tripId,
      previousLevel,
      currentLevel,
      passengerCount,
      capacity,
    });

    const io = getIO();
    const occupancyData = {
      vehicleId,
      tripId,
      routeId,
      level: currentLevel,
      passengerCount,
      capacity,
      occupancyPercentage,
      timestamp: Date.now(),
    };

    io?.to(`vehicle:${vehicleId}`).emit("vehicle:occupancy", occupancyData);
    io?.to(`route:${routeId}`).emit("vehicle:occupancy", occupancyData);
    io?.to("fleet:all").emit("vehicle:occupancy", occupancyData);

    await publishEvent("OCCUPANCY_CHANGED", {
      vehicleId,
      tripId,
      routeId,
      previousLevel: previousLevel || "LOW",
      currentLevel,
      passengerCount,
      capacity,
      occupancyPercentage,
      timestamp: Date.now(),
    });
  }

  return {
    vehicleId,
    tripId,
    routeId,
    previousLevel,
    currentLevel,
    passengerCount,
    capacity,
    occupancyPercentage,
  };
};
