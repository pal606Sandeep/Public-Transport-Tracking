import redisClient from "../../config/redis.js";

export interface VehicleLocation {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  timestamp: number;
}

export const updateVehicleLocation = async (
  vehicleId: string,
  lat: number,
  lon: number,
  speed: number,
  heading: number
): Promise<VehicleLocation> => {
  const payload: VehicleLocation = {
    vehicleId,
    lat,
    lon,
    speed,
    heading,
    timestamp: Date.now(),
  };

  await redisClient.set(
    `vehicle:location:${vehicleId}`,
    JSON.stringify(payload)
  );
  await redisClient.publish(
    "vehicle-location-updates",
    JSON.stringify(payload)
  );

  return payload;
};

export const getVehicleLocation = async (
  vehicleId: string
): Promise<VehicleLocation | null> => {
  const raw = await redisClient.get(`vehicle:location:${vehicleId}`);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as VehicleLocation;
};