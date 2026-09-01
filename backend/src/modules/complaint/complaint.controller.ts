import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { hasPermission } from "../../middlewares/rbac.js";
import * as svc from "./complaint.service.js";

const ok = asyncHandler;
const uid = (req: Request): string => req.user!.id;
const idOf = (req: Request): string => (req.params as { id: string }).id;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any) => ({ id: req.user?.id, role: req.user?.role });
const isStaff = (req: Request): boolean =>
  hasPermission(req.user?.permissions, "MANAGE", "complaint", req.user?.role);

/* ---- passenger-facing ---- */

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.createComplaint(uid(req), req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Complaint submitted", { complaint });
});

export const listMine = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as { page: number; limit: number; status?: string };
  const result = await svc.listMyComplaints(uid(req), q);
  apiResponse(res, 200, true, "Complaints", result);
});

export const getOne = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.getComplaint(idOf(req), { id: uid(req), staff: isStaff(req) });
  apiResponse(res, 200, true, "Complaint", { complaint });
});

export const history = ok(async (req: Request, res: Response): Promise<void> => {
  // Ownership / staff check is enforced by fetching through getComplaint first.
  await svc.getComplaint(idOf(req), { id: uid(req), staff: isStaff(req) });
  const result = await svc.getHistory(idOf(req));
  apiResponse(res, 200, true, "Complaint history", result);
});

export const addAttachment = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.addAttachment(
    idOf(req),
    uid(req),
    isStaff(req),
    (req.body as { key: string }).key,
    actorOf(req)
  );
  apiResponse(res, 200, true, "Attachment added", { complaint });
});

export const submitFeedback = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.submitFeedback(idOf(req), uid(req), req.body as never);
  apiResponse(res, 200, true, "Feedback recorded", { complaint });
});

/* ---- staff / admin ---- */

export const listAll = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
  };
  const result = await svc.listAllComplaints(q);
  apiResponse(res, 200, true, "Complaints", result);
});

export const assign = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { assigneeId: string; note?: string };
  const complaint = await svc.assignComplaint(idOf(req), body.assigneeId, body.note, actorOf(req));
  apiResponse(res, 200, true, "Complaint assigned", { complaint });
});

export const update = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.updateComplaint(idOf(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Complaint updated", { complaint });
});

export const escalate = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.escalateComplaint(idOf(req), req.body as never, actorOf(req));
  apiResponse(res, 200, true, "Complaint escalated", { complaint });
});

export const resolve = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.resolveComplaint(idOf(req), (req.body as { note: string }).note, actorOf(req));
  apiResponse(res, 200, true, "Complaint resolved", { complaint });
});

export const close = ok(async (req: Request, res: Response): Promise<void> => {
  const complaint = await svc.closeComplaint(idOf(req), (req.body as { note?: string }).note, actorOf(req));
  apiResponse(res, 200, true, "Complaint closed", { complaint });
});
