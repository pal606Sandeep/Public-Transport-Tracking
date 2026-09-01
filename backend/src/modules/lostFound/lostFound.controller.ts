import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { hasPermission } from "../../middlewares/rbac.js";
import * as svc from "./lostFound.service.js";

const ok = asyncHandler;
const uid = (req: Request): string => req.user!.id;
const idOf = (req: Request): string => (req.params as { id: string }).id;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any) => ({ id: req.user?.id, role: req.user?.role });
const isStaff = (req: Request): boolean =>
  hasPermission(req.user?.permissions, "MANAGE", "lostFound", req.user?.role);

/* ---- reporter-facing ---- */

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const item = await svc.createItem(uid(req), req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Report submitted", { item });
});

export const listMine = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as { page: number; limit: number; kind?: string; status?: string };
  const result = await svc.listMine(uid(req), q);
  apiResponse(res, 200, true, "Lost & found reports", result);
});

export const getOne = ok(async (req: Request, res: Response): Promise<void> => {
  const item = await svc.getItem(idOf(req), { id: uid(req), staff: isStaff(req) });
  apiResponse(res, 200, true, "Lost & found item", { item });
});

/* ---- staff / admin ---- */

export const listAll = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as {
    page: number;
    limit: number;
    kind?: string;
    status?: string;
    route?: string;
  };
  const result = await svc.listAll(q);
  apiResponse(res, 200, true, "Lost & found items", result);
});

export const matches = ok(async (req: Request, res: Response): Promise<void> => {
  const { windowDays } = req.query as unknown as { windowDays: number };
  const result = await svc.findMatches(idOf(req), windowDays);
  apiResponse(res, 200, true, "Candidate matches", result);
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { assigneeId: string; note?: string };
  const item = await svc.assignItem(idOf(req), body.assigneeId, body.note, actorOf(req));
  apiResponse(res, 200, true, "Item assigned", { item });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const item = await svc.updateItem(idOf(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Item updated", { item });
});

export const confirmReturn = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.confirmReturn(idOf(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Return confirmed", result);
});

export const close = ok(async (req: Request, res: Response): Promise<void> => {
  const item = await svc.closeItem(idOf(req), (req.body as { note?: string }).note, actorOf(req));
  apiResponse(res, 200, true, "Case closed", { item });
});
