import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import {
  updateVehicleLocation,
  getVehicleLocation,
} from "./tracking.service.js";

export const updateLocation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const vehicleId = String(req.params.vehicleId);
    const { lat, lon, speed, heading } = req.body;

    if (
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      apiResponse(res, 400, false, "Valid lat and lon are required");
      return;
    }

    const payload = await updateVehicleLocation(
      vehicleId,
      lat,
      lon,
      typeof speed === "number" ? speed : 0,
      typeof heading === "number" ? heading : 0
    );

    apiResponse(res, 200, true, "Vehicle location updated", payload);
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