import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./payment.service.js";

const ok = asyncHandler;
const parseId = (req: Request): string => (req.params as { id: string }).id;

export const create = ok(async (req: Request, res: Response): Promise<void> => {
  const result = await svc.createPayment(req.user!.id, req.body as never);
  apiResponse(res, 201, true, "Payment created", result);
});

export const qr = ok(async (req: Request, res: Response): Promise<void> => {
  const { tripId, amount, purpose } = req.body as { tripId: string; amount: number; purpose?: string };
  const result = await svc.createQrPayment(req.user!.id, { tripId, amount, purpose });
  apiResponse(res, 201, true, "Payment QR generated", result);
});

export const webhook = ok(async (req: Request, res: Response): Promise<void> => {
  const provider = (req.params as { provider: string }).provider;
  const result = await svc.handleWebhook(provider, req.body as never);
  apiResponse(res, 200, true, "Webhook processed", result);
});

export const list = ok(async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string>;
  const result = await svc.listMyPayments({
    userId: req.user!.id,
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    status: q.status,
  });
  apiResponse(res, 200, true, "Payments", result);
});

export const get = ok(async (req: Request, res: Response): Promise<void> => {
  const doc = await svc.getPaymentById(req.user!.id, parseId(req));
  apiResponse(res, 200, true, "Payment", { payment: doc });
});

export const refund = ok(async (req: Request, res: Response): Promise<void> => {
  const reason = (req.body as { reason?: string | null })?.reason;
  const result = await svc.refundPayment(parseId(req), reason);
  apiResponse(res, 200, true, "Payment refunded", result);
});
