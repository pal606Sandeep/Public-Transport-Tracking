import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./me.service.js";

const ok = asyncHandler;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userOf = (req: any) => ({ id: req.user?.id, role: req.user?.role });
const idOf = (req: Request) => (req.params as { id: string }).id;
const q = (req: Request) => req.query as Record<string, string>;

export const myAssignments = ok(async (req: Request, res: Response): Promise<void> => {
  const data = await svc.getAssignments(userOf(req), q(req).date);
  apiResponse(res, 200, true, "Assignments", data);
});

export const myRequestAssignment = ok(async (req: Request, res: Response): Promise<void> => {
  const data = await svc.requestAssignment(userOf(req), req.body as never);
  apiResponse(res, 201, true, "Assignment requested", data);
});

export const listAssignmentRequests = ok(async (req: Request, res: Response): Promise<void> => {
  const data = await svc.listRequests({
    page: Number(q(req).page ?? 1),
    limit: Number(q(req).limit ?? 20),
    status: q(req).status,
  });
  apiResponse(res, 200, true, "Assignment requests", data);
});

export const decideAssignmentRequest = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { decision: "APPROVE" | "REJECT"; note?: string };
  const data = await svc.decideRequest(idOf(req), body.decision, body.note, userOf(req));
  apiResponse(res, 200, true, "Request decided", data);
});

export const myCheckIn = ok(async (req: Request, res: Response): Promise<void> => {
  const data = await svc.checkIn(userOf(req));
  apiResponse(res, 200, true, "Checked in", data);
});

export const myCheckOut = ok(async (req: Request, res: Response): Promise<void> => {
  const data = await svc.checkOut(userOf(req));
  apiResponse(res, 200, true, "Checked out", data);
});
