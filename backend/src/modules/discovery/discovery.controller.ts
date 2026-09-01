import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./discovery.service.js";

const ok = asyncHandler;

export const routeSearch = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as { q?: string; status?: string; page: number; limit: number };
  const result = await svc.searchRoutes(q);
  apiResponse(res, 200, true, "Route search results", result);
});

export const stopSearch = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as {
    q?: string;
    lat?: number;
    lng?: number;
    radius: number;
    page: number;
    limit: number;
  };
  const result = await svc.searchStops(q);
  apiResponse(res, 200, true, "Stop search results", result);
});

export const findBus = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as { from: string; to: string; page: number; limit: number };
  const result = await svc.findBus(q);
  apiResponse(res, 200, true, "Buses from origin to destination", result);
});

export const planJourney = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as { from: string; to: string; time?: number; maxTransfers: number };
  const result = await svc.planJourney(q);
  apiResponse(res, 200, true, "Journey options", result);
});
