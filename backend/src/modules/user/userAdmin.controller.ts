import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./userAdmin.service.js";

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listUsers({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    search: q.search,
    role: q.role,
    status: q.status,
    sort: q.sort,
    order: q.order,
    includeDeleted: q.includeDeleted === "true",
  });
  apiResponse(res, 200, true, "Users", result);
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const includeDeleted = (req.query as Record<string, string>).includeDeleted === "true";
  const user = await svc.getUserById((req.params as { id: string }).id, includeDeleted);
  apiResponse(res, 200, true, "User", { user });
});

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await svc.createUser(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "User created", { user });
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await svc.updateUser(
    (req.params as { id: string }).id,
    req.body as never,
    actorOf(req)
  );
  apiResponse(res, 200, true, "User updated", { user });
});

export const deactivate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await svc.setUserStatus((req.params as { id: string }).id, "deactivate", actorOf(req));
  apiResponse(res, 200, true, "User deactivated", { user });
});

export const activate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await svc.setUserStatus((req.params as { id: string }).id, "activate", actorOf(req));
  apiResponse(res, 200, true, "User activated", { user });
});

export const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await svc.removeUser((req.params as { id: string }).id, actorOf(req));
  apiResponse(res, 200, true, "User deleted");
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({
  id: req.user?.id,
  role: req.user?.role,
});
