import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./adminDispatch.service.js";

const ok = asyncHandler;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id?: string; role?: string } => ({ id: req.user?.id, role: req.user?.role });

export const sendMessage = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.sendMessage(req.body as never, actorOf(req));
  apiResponse(res, 201, true, "Dispatch message sent", { message: doc });
});

export const listMessages = ok(async (req: Request, res: Response): Promise<void> => {
  const limit = Number((req.query as Record<string, string>).limit ?? 50);
  const docs = await svc.listMessages(limit);
  apiResponse(res, 200, true, "Dispatch messages", {
    messages: docs.map((d) => ({
      id: (d as { _id: { toString(): string } })._id.toString(),
      message: (d as { message: string }).message,
      priority: (d as { priority: string }).priority,
      targetVehicleId: (d as { targetVehicleId?: string }).targetVehicleId,
      fromUserId: (d as { fromUserId?: string }).fromUserId,
      createdAt: ((d as { createdAt: Date }).createdAt).toISOString(),
    })),
  });
});

export const tripForceEndBroadcast = ok(async (req: Request, res: Response): Promise<void> => {
  const id = (req.params as { id: string }).id;
  const reason = (req.body as { reason: string }).reason;
  const result = await svc.broadcastTripForceEnd(id, reason, actorOf(req));
  apiResponse(res, 200, true, "Trip force-end broadcast", result);
});