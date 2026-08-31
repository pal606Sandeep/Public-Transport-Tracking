import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./conductor.service.js";
import type { IConductor } from "./conductor.model.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listConductors({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    status: q.status,
  });
  apiResponse(res, 200, true, "Conductors", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getConductorById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Conductor", { conductor: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createConductor(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Conductor created", { conductor: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateConductor(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Conductor updated", { conductor: doc });
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.assignConductor(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Conductor assigned", { conductor: doc });
});

export const status = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.setConductorStatus(parseId(req), (req.body as { status: string }).status as IConductor["status"]);
  apiResponse(res, 200, true, "Conductor status updated");
});

export const attendance = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.recordAttendance(parseId(req), req.body as never);
  apiResponse(res, 200, true, "Attendance recorded", { conductor: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeConductor(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Conductor deleted");
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });
