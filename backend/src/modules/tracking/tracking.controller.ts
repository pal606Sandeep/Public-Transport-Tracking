import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import {
  updateVehicleLocation,
  getVehicleLocation,
  getVehicleStatus,
  getVehicleETA,
  getVehicleOccupancy,
  enqueueGPSProcessing,
  type GPSSchema,
} from "./tracking.service.js";

export const updateLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.vehicleId);
    const { tripId, driverId, latitude, longitude, speed, heading, accuracy, timestamp } = req.body as Partial<GPSSchema> & { timestamp?: number };

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      apiResponse(res, 400, false, "Valid latitude and longitude are required");
      return;
    }

    const gpsData: GPSSchema = {
      vehicleId,
      tripId: tripId || "",
      driverId: driverId || "",
      latitude,
      longitude,
      speed: typeof speed === "number" ? speed : 0,
      heading: typeof heading === "number" ? heading : 0,
      accuracy: typeof accuracy === "number" ? accuracy : 0,
      timestamp: timestamp || Date.now(),
    };

    await updateVehicleLocation(gpsData);
    await enqueueGPSProcessing(gpsData);

    apiResponse(res, 202, true, "Vehicle location accepted for processing", { vehicleId });
  }
);

export const getLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.vehicleId);
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
    const vehicleId = String(req.params.vehicleId);
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
    const vehicleId = String(req.params.vehicleId);
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
    const vehicleId = String(req.params.vehicleId);
    const occupancy = await getVehicleOccupancy(vehicleId);

    if (!occupancy) {
      apiResponse(res, 404, false, "No occupancy found for vehicle");
      return;
    }

    apiResponse(res, 200, true, "Vehicle occupancy retrieved", occupancy);
  }
);