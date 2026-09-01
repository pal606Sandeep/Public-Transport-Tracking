import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./systemSetting.service.js";

const ok = asyncHandler;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listSettings({
    q: q.q,
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 50),
  });
  apiResponse(res, 200, true, "Settings", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const key = (req.params as { key: string }).key;
  const doc = await svc.getSetting(key);
  apiResponse(res, 200, true, "Setting", { setting: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createSetting(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Setting created", { setting: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const key = (req.params as { key: string }).key;
  const doc = await svc.updateSetting(key, req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Setting updated", { setting: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  const key = (req.params as { key: string }).key;
  await svc.removeSetting(key, actorOf(req));
  apiResponse(res, 200, true, "Setting deleted");
});

export const bulkUpsert = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.bulkUpsert(
    (req.body as { settings: never[] }).settings,
    actorOf(req)
  );
  apiResponse(res, 200, true, "Bulk upsert complete", result);
});