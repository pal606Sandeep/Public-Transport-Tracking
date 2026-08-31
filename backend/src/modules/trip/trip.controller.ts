import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./trip.service.js";

const ok = asyncHandler;
const idOf = (req: Request) => (req.params as { id: string }).id;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any) => ({ id: req.user?.id, role: req.user?.role });
const q = (req: Request) => req.query as Record<string, string>;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.listTrips({
    page: Number(q(req).page ?? 1),
    limit: Number(q(req).limit ?? 20),
    status: q(req).status,
    route: q(req).route,
    driver: q(req).driver,
    dateFrom: q(req).dateFrom ? new Date(q(req).dateFrom) : undefined,
    dateTo: q(req).dateTo ? new Date(q(req).dateTo) : undefined,
  });
  apiResponse(res, 200, true, "Trips", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.getTripById(idOf(req));
  apiResponse(res, 200, true, "Trip", { trip });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.createTrip(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Trip created", { trip });
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.assignTrip(idOf(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Trip assigned", { trip });
});

export const transition = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.transitionTrip(idOf(req), (req.body as { status: string }).status as never, undefined, actorOf(req));
  apiResponse(res, 200, true, "Trip status updated", { trip });
});

export const cancel = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.transitionTrip(idOf(req), "CANCELLED", { reason: (req.body as { reason?: string })?.reason }, actorOf(req));
  apiResponse(res, 200, true, "Trip cancelled", { trip });
});

export const miss = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.transitionTrip(idOf(req), "MISSED", undefined, actorOf(req));
  apiResponse(res, 200, true, "Trip marked missed", { trip });
});

export const complete = ok(async (req: Request, res: Response): Promise<void> => {
  const trip = await svc.transitionTrip(idOf(req), "COMPLETED", undefined, actorOf(req));
  apiResponse(res, 200, true, "Trip completed", { trip });
});

export const bulk = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { tripIds: string[]; status: "CANCELLED" | "MISSED"; reason?: string };
  const result = await svc.bulkUpdateStatus(body.tripIds, body.status, { reason: body.reason }, actorOf(req));
  apiResponse(res, 200, true, "Trips updated", result);
});
