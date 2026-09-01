import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./serviceAlert.service.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listServiceAlerts({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    status: q.status,
    type: q.type,
    search: q.search,
  });
  apiResponse(res, 200, true, "Service alerts", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getServiceAlertById(parseId(req));
  apiResponse(res, 200, true, "Service alert", { serviceAlert: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createServiceAlert(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Service alert created", { serviceAlert: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateServiceAlert(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Service alert updated", { serviceAlert: doc });
});

export const publish = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.publishServiceAlert(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Service alert published", { serviceAlert: doc });
});

export const cancel = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.cancelServiceAlert(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Service alert cancelled", { serviceAlert: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeServiceAlert(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Service alert deleted");
});

export const publicList = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.publicListServiceAlerts({ routeId: q.routeId, stopId: q.stopId });
  apiResponse(res, 200, true, "Service alerts", result);
});
