import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./ticket.service.js";

const ok = asyncHandler;
const parseId = (req: Request): string => (req.params as { id: string }).id;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actorOf = (req: any): { id: string; role?: string } => ({ id: req.user!.id, role: req.user?.role });

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.createTicket(req.user!.id, actorOf(req), req.body as never);
  apiResponse(res, 201, true, "Ticket created", { ticket: doc });
});

export const createBulk = ok(async (req: Request, res: Response): Promise<void> => {
  const items = (req.body as { items: never[] }).items;
  const result = await svc.createTicketsBulk(req.user!.id, actorOf(req), { items });
  apiResponse(res, 200, true, "Bulk tickets processed", result);
});

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listMyTickets({
    userId: req.user!.id,
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    status: q.status,
    search: q.search,
  });
  apiResponse(res, 200, true, "Tickets", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getTicketById(req.user!.id, parseId(req));
  apiResponse(res, 200, true, "Ticket", { ticket: doc });
});

export const validateTicket = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.validateTicket({ id: parseId(req), ...(req.body as { ticketCode?: string }) });
  apiResponse(res, 200, true, "Ticket validated", result);
});

export const validateByCode = ok(async (req: Request, res: Response): Promise<void> => {
  const code = (req.body as { ticketCode?: string })?.ticketCode;
  const result = await svc.validateTicket({ ticketCode: code });
  apiResponse(res, 200, true, "Ticket validated", result);
});

export const cancel = ok(async (req: Request, res: Response): Promise<void> => {
  const reason = (req.body as { reason?: string | null })?.reason;
  const doc = await svc.cancelTicket(req.user!.id, parseId(req), reason);
  apiResponse(res, 200, true, "Ticket cancelled", { ticket: doc });
});

/* passes */

export const purchasePass = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.purchasePass(req.user!.id, req.body as never);
  apiResponse(res, 201, true, "Pass purchased", { pass: doc });
});

export const listPasses = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.listMyPasses(req.user!.id);
  apiResponse(res, 200, true, "Passes", result);
});

export const activePass = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.getMyActivePass(req.user!.id);
  apiResponse(res, 200, true, "Active pass", { pass: result });
});
