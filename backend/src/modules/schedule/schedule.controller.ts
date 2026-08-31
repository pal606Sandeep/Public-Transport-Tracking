import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./schedule.service.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listSchedules({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    route: q.route,
    isActive: q.isActive,
    includeDeleted: q.includeDeleted === "true",
  });
  apiResponse(res, 200, true, "Schedules", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getScheduleById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Schedule", { schedule: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createSchedule(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Schedule created", { schedule: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateSchedule(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Schedule updated", { schedule: doc });
});

export const generate = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.generateTrips(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Trips generated", result);
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeSchedule(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Schedule deleted");
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });
