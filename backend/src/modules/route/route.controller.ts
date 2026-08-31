import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./route.service.js";
import type { IRoute } from "./route.model.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listRoutes({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    status: q.status,
    includeDeleted: q.includeDeleted === "true",
  });
  apiResponse(res, 200, true, "Routes", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getRouteById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Route", { route: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createRoute(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Route created", { route: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateRoute(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Route updated", { route: doc });
});

export const activate = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.setRouteStatus(parseId(req), "ACTIVE", actorOf(req));
  apiResponse(res, 200, true, "Route activated", { route: doc });
});

export const deactivate = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.setRouteStatus(parseId(req), "INACTIVE", actorOf(req));
  apiResponse(res, 200, true, "Route deactivated", { route: doc });
});

export const addStop = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.addRouteStop(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Stop added to route", { route: doc });
});

export const removeStop = ok(async (req: Request, res: Response): Promise<void> => {
  const stopId = (req.params as { stopId: string }).stopId;
  const doc = await svc.removeRouteStop(parseId(req), stopId, actorOf(req));
  apiResponse(res, 200, true, "Stop removed from route", { route: doc });
});

export const reorder = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.reorderRouteStops(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Stops reordered", { route: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeRoute(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Route deleted");
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

export type { IRoute };
