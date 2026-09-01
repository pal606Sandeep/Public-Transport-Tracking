import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { occupancyAnalytics } from "./occupancy.service.js";

export const getOccupancy = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await occupancyAnalytics({
    tripId: q.tripId,
    routeId: q.routeId,
    vehicleId: q.vehicleId,
    from: q.from ? Number(q.from) : undefined,
    to: q.to ? Number(q.to) : undefined,
  });
  apiResponse(res, 200, true, "Occupancy analytics", result);
});
