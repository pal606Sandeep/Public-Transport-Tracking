import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./incident.service.js";

const ok = asyncHandler;
const id = (req: Request): string => (req.params as { id: string }).id;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listIncidents({
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    status: q.status,
    type: q.type,
    source: q.source,
    assignedToMe: q.assignedToMe === "true",
    assigneeId: (req as unknown as { user?: { id?: string } }).user?.id,
    search: q.search,
  });
  apiResponse(res, 200, true, "Incidents", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getIncidentById(id(req));
  apiResponse(res, 200, true, "Incident", { incident: doc });
});

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createIncident(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Incident created", { incident: doc });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.updateIncident(id(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Incident updated", { incident: doc });
});

export const remove = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removeIncident(id(req), actorOf(req));
  apiResponse(res, 200, true, "Incident deleted");
});

export const acknowledge = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.acknowledgeIncident(id(req), actorOf(req));
  apiResponse(res, 200, true, "Incident acknowledged", { incident: doc });
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.assignIncident(id(req), (req.body as { assignedTo?: string } | undefined)?.assignedTo ?? "", actorOf(req));
  apiResponse(res, 200, true, "Incident assigned", { incident: doc });
});

export const resolve = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.resolveIncident(id(req), (req.body as { note?: string } | undefined)?.note, actorOf(req));
  apiResponse(res, 200, true, "Incident resolved", { incident: doc });
});

export const close = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.closeIncident(id(req), actorOf(req));
  apiResponse(res, 200, true, "Incident closed", { incident: doc });
});
