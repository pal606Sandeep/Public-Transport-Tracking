import mongoose from "mongoose";
import { Vehicle } from "../../../modules/vehicle/vehicle.model.js";
import { Trip } from "../../../modules/trip/trip.model.js";
import { setDriverStatusState, setVehicleStatusState, setTripState, addRouteVehicle } from "./redis-state.service.js";
import logger from "../../../utils/logger.js";

/**
 * P2-03 — Cold-start rebuild.
 *
 * On worker/server startup, before serving real-time state, re-populate Redis
 * from Mongo so active vehicles / trips / drivers have a baseline. All keys
 * carry TTLs; a later flush + restart simply rebuilds again.
 */

const isObjectId = (id: unknown): boolean =>
  mongoose.Types.ObjectId.isValid(id as string);

const toStr = (id: unknown): string | undefined =>
  isObjectId(id) ? String(id) : undefined;

export const rebuildTrackingState = async (): Promise<{
  vehicles: number;
  trips: number;
  drivers: number;
}> => {
  const counters = { vehicles: 0, trips: 0, drivers: 0 };

  const activeTrips = await Trip.find({ status: { $in: ["ACTIVE", "SCHEDULED"] } })
    .populate("vehicle driver route schedule")
    .lean();

  for (const trip of activeTrips) {
    const tripId = toStr(trip._id);
    const vehicleId = toStr((trip.vehicle as { _id?: unknown })?._id ?? trip.vehicle);
    const driverId = toStr((trip.driver as { _id?: unknown })?._id ?? trip.driver);
    const routeId = toStr((trip.route as { _id?: unknown })?._id ?? trip.route);

    if (!tripId) continue;
    await setTripState(tripId, {
      routeId: routeId || "",
      vehicleId: vehicleId || "",
      driverId: driverId || "",
      status: trip.status as string,
      startTime: trip.startTime ? new Date(trip.startTime).getTime() : 0,
    });
    counters.trips++;

    if (vehicleId) {
      const liveStatus =
        trip.status === "ACTIVE" ? "ON_TRIP" : trip.status === "SCHEDULED" ? "IDLE" : "ONLINE";
      await setVehicleStatusState(vehicleId, {
        status: liveStatus,
        tripId,
        routeId: routeId || "",
        driverId: driverId || "",
        lastSeen: Date.now(),
        updatedAt: Date.now(),
      });
      counters.vehicles++;
      if (routeId) await addRouteVehicle(routeId, vehicleId);
    }

    if (driverId) {
      const driverStatus =
        trip.status === "ACTIVE" ? "ON_TRIP" : trip.status === "SCHEDULED" ? "ONLINE" : "IDLE";
      await setDriverStatusState(driverId, {
        status: driverStatus,
        vehicleId: vehicleId || "",
        tripId,
        updatedAt: Date.now(),
      });
      counters.drivers++;
    }
  }

  // Mark any remaining registry vehicles ONLINE/IDLE baseline (optional).
  if (activeTrips.length === 0) {
    const vehicles = await Vehicle.find({ status: "ACTIVE" }).lean();
    for (const v of vehicles) {
      const vid = toStr(v._id);
      if (!vid) continue;
      await setVehicleStatusState(vid, {
        status: "ONLINE",
        lastSeen: Date.now(),
        updatedAt: Date.now(),
      });
      counters.vehicles++;
    }
  }

  logger.info("Redis tracking state rebuilt from Mongo", counters);
  return counters;
};
