import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { isAdminRole } from "../../constants/roles.js";
import type { AuthUser } from "../../types/express.js";
import { validate, parseOrThrow } from "../../utils/validation.js";
import {
  updateVehicleLocation,
  getVehicleLocation,
  getVehicleStatus,
  getVehicleETA,
  getVehicleOccupancy,
  processGPSSchema,
  processHeartbeat,
} from "./tracking.service.js";
import {
  gpsLocationSchema,
  bulkLocationSchema,
  heartbeatSchema,
  sosSchema,
  sosAckSchema,
  occupancySchema,
  tripHistoryQuerySchema,
} from "./validation/tracking.validation.js";
import { getTripGPSHistory } from "./geo/gps-history.service.js";
import { detectCurrentStop } from "./geo/current-stop.service.js";
import { triggerSOS, acknowledgeSOS } from "./geo/sos.service.js";
import { setDriverOnTrip, setDriverOnBreak, setDriverOnline, setDriverOffline } from "./geo/driver-status.service.js";
import { assertBoundDevice } from "./security/device-binding.service.js";
import { occupancyQueue } from "./queues/tracking.queues.js";
import { Driver } from "../driver/driver.model.js";
import { Trip } from "../trip/trip.model.js";
import { Vehicle } from "../vehicle/vehicle.model.js";
import logger from "../../utils/logger.js";

/**
 * P2-26 — only the driver who owns the fix (matched by their linked User
 * account) may report it; dispatchers/admins may report on a driver's
 * behalf (e.g. tooling, tests). Guests can never reach these routes at all
 * (see tracking.routes.ts).
 */
const assertDriverOwnsFix = async (user: AuthUser | undefined, driverId: string): Promise<void> => {
  if (!user) throw AppError.unauthorized("Authentication required", "NO_TOKEN");
  if (isAdminRole(user.role) || user.role === "DISPATCHER") return;
  if (user.role !== "DRIVER") {
    throw AppError.forbidden("Only drivers may report GPS fixes", "FORBIDDEN");
  }
  const driver = await Driver.findOne({ user: user.id }).select("_id").lean();
  if (!driver || driver._id.toString() !== driverId) {
    throw AppError.forbidden("Trip not owned by this driver", "TRIP_NOT_OWNED");
  }
};

export const updateLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = parseOrThrow(gpsLocationSchema, req.body);

    await assertDriverOwnsFix(req.user, body.driverId);
    await assertBoundDevice(body.driverId, body.deviceId);

    // processGPSSchema is the single source of truth for validate → anomaly
    // → update → broadcast/route processing → persist; calling it once here
    // (rather than duplicating validate/anomaly/update in the controller
    // too) avoids double-checking anomaly detection against its own
    // just-written cache, which would self-flag every fix as a duplicate.
    const { routeId } = await processGPSSchema(body);

    if (body.driverId) {
      await setDriverOnTrip(body.driverId, body.vehicleId, body.tripId, routeId);
    }

    apiResponse(res, 202, true, "Vehicle location accepted for processing", { vehicleId: body.vehicleId });
  }
);

export const updateBulkLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = parseOrThrow(bulkLocationSchema, req.body);

    const sorted = [...body.locations].sort((a, b) => a.timestamp - b.timestamp);

    let accepted = 0;
    let rejected = 0;
    const rejectedItems: Array<{ index: number; reason: string }> = [];
    let lastAccepted: (typeof sorted)[number] | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const fix = sorted[i];
      try {
        await assertDriverOwnsFix(req.user, fix.driverId);
        await assertBoundDevice(fix.driverId, fix.deviceId);

        await processGPSSchema(fix);
        accepted++;
        lastAccepted = fix;
      } catch (err) {
        const error = err as Error & { code?: string; statusCode?: number };
        rejected++;
        rejectedItems.push({ index: i, reason: error.message || "REJECTED" });
        if (error.statusCode === 404 || error.statusCode === 409 || error.statusCode === 403) {
          logger.warn(`Bulk GPS item rejected: ${error.message}`, { index: i });
        }
      }
    }

    // P2-06 — after the backlog is flushed, the live position reflects "now"
    // using the most recently reported real fix, not the (possibly minutes-
    // old) tail of the backlog.
    if (lastAccepted) {
      await updateVehicleLocation({ ...lastAccepted, timestamp: Date.now() });
    }

    apiResponse(res, 202, true, "Bulk GPS locations processed", {
      total: sorted.length,
      accepted,
      rejected,
      rejectedItems: rejectedItems.slice(0, 20),
      vehicleId: sorted[0]?.vehicleId,
    });
  }
);

export const heartbeat = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = parseOrThrow(heartbeatSchema, req.body);
    if (body.driverId) {
      await assertDriverOwnsFix(req.user, body.driverId);
    }
    await processHeartbeat(body);
    apiResponse(res, 200, true, "Heartbeat recorded", { vehicleId: body.vehicleId, timestamp: Date.now() });
  }
);

export const sos = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = parseOrThrow(sosSchema, req.body);
    await assertDriverOwnsFix(req.user, body.driverId);
    const result = await triggerSOS({
      vehicleId: body.vehicleId,
      tripId: body.tripId,
      driverId: body.driverId,
      latitude: body.latitude,
      longitude: body.longitude,
      message: body.message,
      timestamp: Date.now(),
    });
    apiResponse(res, 200, true, "SOS broadcast to all fleet monitors", { traceId: result.traceId });
  }
);

export const sosAck = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = parseOrThrow(sosAckSchema, req.body);
    await acknowledgeSOS(req.user?.id ?? "unknown", body.vehicleId, body.driverId);
    apiResponse(res, 200, true, "SOS acknowledged", { vehicleId: body.vehicleId });
  }
);

export const submitOccupancy = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = parseOrThrow(occupancySchema, req.body);

    const trip = await Trip.findById(body.tripId).select("route vehicle status").lean();
    if (!trip) throw AppError.notFound("Trip not found", "TRIP_NOT_FOUND");
    if (trip.vehicle?.toString() !== body.vehicleId) {
      throw AppError.forbidden("Vehicle is not assigned to this trip", "VEHICLE_NOT_ASSIGNED");
    }

    const vehicle = await Vehicle.findById(body.vehicleId).select("capacity").lean();
    if (!vehicle) throw AppError.notFound("Vehicle not found", "VEHICLE_NOT_FOUND");

    await occupancyQueue.add("process-occupancy", {
      vehicleId: body.vehicleId,
      tripId: body.tripId,
      routeId: trip.route?.toString() ?? "",
      passengerCount: body.passengerCount,
      capacity: vehicle.capacity,
    });

    apiResponse(res, 202, true, "Occupancy update accepted for processing", { vehicleId: body.vehicleId });
  }
);

export const getVehicleSnapshot = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.id);
    const [location, status, eta, occupancy] = await Promise.all([
      getVehicleLocation(vehicleId),
      getVehicleStatus(vehicleId),
      getVehicleETA(vehicleId),
      getVehicleOccupancy(vehicleId),
    ]);

    if (!location && !status) {
      apiResponse(res, 404, false, "No tracking state found for vehicle");
      return;
    }

    let currentStop = null;
    if (status?.routeId && location) {
      currentStop = await detectCurrentStop(status.routeId, location.lat, location.lon).catch(() => null);
    }

    apiResponse(res, 200, true, "Vehicle snapshot retrieved", {
      vehicleId,
      location,
      status,
      eta,
      occupancy,
      currentStop,
    });
  }
);

export const getLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.id);
    const location = await getVehicleLocation(vehicleId);

    if (!location) {
      apiResponse(res, 404, false, "No location found for vehicle");
      return;
    }

    apiResponse(res, 200, true, "Vehicle location retrieved", location);
  }
);

export const getStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.id);
    const status = await getVehicleStatus(vehicleId);

    if (!status) {
      apiResponse(res, 404, false, "No status found for vehicle");
      return;
    }

    apiResponse(res, 200, true, "Vehicle status retrieved", status);
  }
);

export const getETA = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.id);
    const eta = await getVehicleETA(vehicleId);

    if (!eta) {
      apiResponse(res, 404, false, "No ETA found for vehicle");
      return;
    }

    apiResponse(res, 200, true, "Vehicle ETA retrieved", eta);
  }
);

export const getOccupancy = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.id);
    const occupancy = await getVehicleOccupancy(vehicleId);

    if (!occupancy) {
      apiResponse(res, 404, false, "No occupancy found for vehicle");
      return;
    }

    apiResponse(res, 200, true, "Vehicle occupancy retrieved", occupancy);
  }
);

export const getRouteSnapshot = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const routeId = String(req.params.id);
    const vehicles = await getRouteVehicles(routeId);

    apiResponse(res, 200, true, "Route snapshot retrieved", { routeId, vehicles });
  }
);

export const getTripSnapshot = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tripId = String(req.params.id);
    const [vehicleId, location, status, eta] = await Promise.all([
      getTripVehicleId(tripId),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
    ]);

    if (!vehicleId) {
      apiResponse(res, 404, false, "No trip state found");
      return;
    }

    const [loc, st, e] = await Promise.all([
      getVehicleLocation(vehicleId),
      getVehicleStatus(vehicleId),
      getVehicleETA(vehicleId),
    ]);

    apiResponse(res, 200, true, "Trip snapshot retrieved", {
      tripId,
      vehicleId,
      location: loc,
      status: st,
      eta: e,
    });
  }
);

export const getTripHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tripId = String(req.params.id);
    const { from, to, page, limit } = parseOrThrow(tripHistoryQuerySchema, req.query);

    const history = await getTripGPSHistory(tripId, { from, to, page, limit });

    apiResponse(res, 200, true, "Trip GPS history retrieved", history);
  }
);

async function getRouteVehicles(routeId: string): Promise<string[]> {
  const { getRouteVehicles: getRouteVehiclesRedis } = await import("./state/redis-state.service.js");
  return getRouteVehiclesRedis(routeId);
}

async function getTripVehicleId(tripId: string): Promise<string | null> {
  const { getTripState } = await import("./state/redis-state.service.js");
  const state = await getTripState(tripId);
  return (state?.vehicleId as string) ?? null;
}
