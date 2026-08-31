import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./sync.service.js";
import { SyncResult } from "./sync.service.js";

const ok = asyncHandler;

const parseUpdatedSince = (req: Request): Date | undefined => {
  const v = (req.query as Record<string, string>)?.updatedSince;
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const respond = (res: Response, resource: string, result: SyncResult): void => {
  const etag = svc.etagOf(result.checksum);
  const inm = (res.req.headers["if-none-match"] as string) ?? "";
  if (inm && inm.includes(etag)) {
    res.status(304).end();
    return;
  }
  res.setHeader("ETag", etag);
  apiResponse(res, 200, true, resource, result);
};

export const routes = ok(async (req: Request, res: Response): Promise<void> => {
  respond(res, "Routes synced", await svc.syncRoutes(parseUpdatedSince(req)));
});

export const stops = ok(async (req: Request, res: Response): Promise<void> => {
  respond(res, "Stops synced", await svc.syncStops(parseUpdatedSince(req)));
});

export const schedules = ok(async (req: Request, res: Response): Promise<void> => {
  respond(res, "Schedules synced", await svc.syncSchedules(parseUpdatedSince(req)));
});

export const fares = ok(async (req: Request, res: Response): Promise<void> => {
  respond(res, "Fares synced", await svc.syncFares());
});
