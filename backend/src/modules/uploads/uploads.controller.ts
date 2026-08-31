import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import * as svc from "./uploads.service.js";

const ok = asyncHandler;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userOf = (req: any) => ({ id: req.user?.id, role: req.user?.role });

export const presign = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { purpose: string; contentType: string; sizeBytes: number };
  const result = await svc.presignUpload(body.purpose as never, body.contentType, body.sizeBytes, userOf(req));
  apiResponse(res, 200, true, "Presigned upload URL", result);
});

export const put = ok(async (req: Request, res: Response): Promise<void> => {
  const key = (req.params as { key: string }).key;
  const token = (req.query as Record<string, string>).token;
  const expires = (req.query as Record<string, string>).expires;
  const body: Buffer = (req.body as Buffer) ?? Buffer.alloc(0);
  const result = await svc.storeUpload(key, token, expires, body);
  apiResponse(res, 201, true, "Upload stored", result);
});

export const confirm = ok(async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { key: string };
  const result = await svc.confirmUpload(body.key, userOf(req));
  apiResponse(res, 200, true, "Upload confirmed", result);
});
