import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import logger from "../utils/logger.js";

export const TRACE_ID_HEADER = "x-request-id";

/**
 * Attach a `traceId` to every request (from the `x-request-id` header when
 * supplied by a gateway/client, otherwise generate one). The traceId is
 * exposed on the response header, on `res.locals`, and used by the logger and
 * the centralized error handler so a single request can be correlated.
 */
export const traceIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const incoming = req.headers[TRACE_ID_HEADER];
  const traceId =
    typeof incoming === "string" && incoming.length ? incoming : randomUUID();

  res.locals.traceId = traceId;
  res.setHeader(TRACE_ID_HEADER, traceId);

  // Override logger for this request so subsequent module logs carry the trace.
  (req as unknown as { log: typeof logger }).log = logger.child({ traceId });

  next();
};
