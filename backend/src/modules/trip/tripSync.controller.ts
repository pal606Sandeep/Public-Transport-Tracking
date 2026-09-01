import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./tripSync.service.js";

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const passengerCountBulk = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const items = (req.body as { items: never[] }).items;
  const result = await svc.syncPassengerCountBulk(req.user!.id, parseId(req), items);
  apiResponse(res, 200, true, "Passenger counts synced", result);
});

export const reconcile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.reconcileTrip(parseId(req), req.body as never);
  apiResponse(res, 200, true, "Reconciliation computed", { reconciliation: result });
});
