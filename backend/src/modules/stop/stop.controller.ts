import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./stop.service.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const near = q.lat && q.lng ? { lng: Number(q.lng), lat: Number(q.lat), maxDistance: q.maxDistance ? Number(q.maxDistance) : undefined } : undefined;
  const result = await svc.listStops({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    isActive: q.isActive ? q.isActive === "true" : undefined,
    near,
  });
  apiResponse(res, 200, true, "Stops", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getStopById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Stop", { stop: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createStop(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Stop created", { stop: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateStop(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Stop updated", { stop: doc });
});

export const deactivate = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.deactivateStop(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Stop deactivated", { stop: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeStop(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Stop deleted");
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });
