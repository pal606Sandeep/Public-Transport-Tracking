import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import {
  passengerAnalytics,
  vehicleAnalytics,
  driverAnalytics,
  routeAnalytics,
  revenueAnalytics,
} from "./analytics.service.js";

const ok = asyncHandler;

const range = (req: Request): { from?: number; to?: number } => {
  const q = req.query as Record<string, string>;
  return {
    from: q.from ? Number(q.from) : undefined,
    to: q.to ? Number(q.to) : undefined,
  };
};

export const passengers = ok(async (req: Request, res: Response): Promise<void> => {
  apiResponse(res, 200, true, "Passenger analytics", await passengerAnalytics(range(req)));
});

export const vehicles = ok(async (req: Request, res: Response): Promise<void> => {
  apiResponse(res, 200, true, "Vehicle analytics", await vehicleAnalytics(range(req)));
});

export const drivers = ok(async (req: Request, res: Response): Promise<void> => {
  apiResponse(res, 200, true, "Driver analytics", await driverAnalytics(range(req)));
});

export const routes = ok(async (req: Request, res: Response): Promise<void> => {
  apiResponse(res, 200, true, "Route analytics", await routeAnalytics(range(req)));
});

export const revenue = ok(async (req: Request, res: Response): Promise<void> => {
  apiResponse(res, 200, true, "Revenue analytics", await revenueAnalytics(range(req)));
});
