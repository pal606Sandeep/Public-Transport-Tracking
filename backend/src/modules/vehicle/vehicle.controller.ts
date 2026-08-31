import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./vehicle.service.js";

const ok = asyncHandler;

const parseId = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listVehicles({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    status: q.status,
    includeDeleted: q.includeDeleted === "true",
  });
  apiResponse(res, 200, true, "Vehicles", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getVehicleById(parseId(req), (req.query as Record<string, string>)?.includeDeleted === "true");
  apiResponse(res, 200, true, "Vehicle", { vehicle: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createVehicle(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Vehicle created", { vehicle: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateVehicle(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Vehicle updated", { vehicle: doc });
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.assignVehicle(parseId(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Vehicle assigned", { vehicle: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeVehicle(parseId(req), actorOf(req));
  apiResponse(res, 200, true, "Vehicle deleted");
});

export const getPublic = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getVehicleById(parseId(req), false);
  const { _id, registrationNumber, model, type, capacity, status, wheelchairAccessible, amenities } = doc as Record<string, unknown>;
  apiResponse(res, 200, true, "Vehicle", { vehicle: { _id, registrationNumber, model, type, capacity, status, wheelchairAccessible, amenities } });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });
