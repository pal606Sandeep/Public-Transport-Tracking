import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./auditLog.service.js";

const ok = asyncHandler;
const id = (req: Request): string => (req.params as { id: string }).id;

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listAuditLogs({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    actorId: q.actorId,
    action: q.action,
    resource: q.resource,
    resourceId: q.resourceId,
    severity: q.severity,
    from: q.from ? Number(q.from) : undefined,
    to: q.to ? Number(q.to) : undefined,
  });
  apiResponse(res, 200, true, "Audit logs", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getAuditLog(id(req));
  apiResponse(res, 200, true, "Audit log", { log: doc });
});