import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./driver.service.js";
import type { IDriver } from "./driver.model.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listDrivers({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    status: q.status,
  });
  apiResponse(res, 200, true, "Drivers", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getDriverById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Driver", { driver: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createDriver(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Driver created", { driver: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateDriver(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Driver updated", { driver: doc });
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.assignDriver(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Driver assigned", { driver: doc });
});

export const status = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.setDriverStatus(parseId(req), (req.body as { status: string }).status as IDriver["status"]);
  apiResponse(res, 200, true, "Driver status updated");
});

export const attendance = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.recordAttendance(parseId(req), req.body as never);
  apiResponse(res, 200, true, "Attendance recorded", { driver: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeDriver(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Driver deleted");
});

export const myPerformance = ok(async (req: Request, res: Response): Promise<void> => {
  const perf = await svc.getPerformanceByUser(req.user!.id);
  apiResponse(res, 200, true, "Driver performance", { performance: perf });
});

export const adminPerformance = ok(async (req: Request, res: Response): Promise<void> => {
  const perf = await svc.getPerformanceByDriverId(parseId(req));
  apiResponse(res, 200, true, "Driver performance", { performance: perf });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });
