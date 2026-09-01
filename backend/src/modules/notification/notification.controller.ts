import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./notification.service.js";

const ok = asyncHandler;
const uid = (req: Request): string => req.user!.id;

/* ---- passenger / user-facing ---- */

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as unknown as { page: number; limit: number; unreadOnly?: boolean };
  const result = await svc.listNotifications(uid(req), q);
  apiResponse(res, 200, true, "Notifications", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getNotification(uid(req), (req.params as { id: string }).id);
  apiResponse(res, 200, true, "Notification", { notification: doc });
});

export const setRead = ok(async (req: Request, res: Response): Promise<void> => {
  const { read } = req.body as { read: boolean };
  const doc = await svc.setRead(uid(req), (req.params as { id: string }).id, read);
  apiResponse(res, 200, true, read ? "Marked read" : "Marked unread", { notification: doc });
});

export const readAll = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.markAllRead(uid(req));
  apiResponse(res, 200, true, "All notifications marked read", result);
});

export const getPreferences = ok(async (req: Request, res: Response): Promise<void> => {
  const prefs = await svc.getOrCreatePreferences(uid(req));
  apiResponse(res, 200, true, "Notification preferences", { preferences: prefs });
});

export const updatePreferences = ok(async (req: Request, res: Response): Promise<void> => {
  const prefs = await svc.updatePreferences(uid(req), req.body as never);
  apiResponse(res, 200, true, "Preferences updated", { preferences: prefs });
});

export const registerPush = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.registerPushSubscription(uid(req), req.body as never);
  apiResponse(res, 201, true, "Push subscription registered", result);
});

export const removePush = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.removePushSubscription(uid(req), (req.body as { endpoint: string }).endpoint);
  apiResponse(res, 200, true, "Push subscription removed");
});

/* ---- admin: templates ---- */

export const listTemplates = ok(async (_req: Request, res: Response): Promise<void> => {
  const templates = await svc.listTemplates();
  apiResponse(res, 200, true, "Notification templates", { templates });
});

export const upsertTemplate = ok(async (req: Request, res: Response): Promise<void> => {
  const template = await svc.upsertTemplate(req.body as never);
  apiResponse(res, 200, true, "Template saved", { template });
});

export const deleteTemplate = ok(async (req: Request, res: Response): Promise<void> => {
  await svc.deleteTemplate((req.params as { key: string }).key);
  apiResponse(res, 200, true, "Template deleted");
});

export const previewTemplate = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { key: string; vars: Record<string, unknown> };
  const rendered = await svc.renderTemplate(body.key, body.vars);
  apiResponse(res, 200, true, "Template preview", rendered);
});
