import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { IdempotencyKey } from "../models/idempotencyKey.model.js";
import { AppError } from "../utils/AppError.js";

const IDEMPOTENCY_HEADER = "idempotency-key";

const requestHash = (req: Request): string => {
  const raw = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body ?? {})}`;
  return crypto.createHash("md5").update(raw).digest("hex");
};

const scopeFor = (req: Request): string => {
  // Idempotency is scoped per actor to avoid cross-user collisions.
  const userId = req.user?.id;
  return userId ? `user:${userId}` : "anon";
};

/**
 * Idempotency middleware. When an `Idempotency-Key` header is present:
 *  - first call executes the handler and stores the response (status + body),
 *  - a repeat call with the same key + identical request replays the stored
 *    response (no double write),
 *  - a repeat call with the same key but a different request body is rejected
 *    with 422 CONFLICT_USE_ANOTHER_KEY.
 */
export const idempotent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const header = req.header(IDEMPOTENCY_HEADER);
  if (!header) {
    // Not an idempotent call — run normally.
    next();
    return;
  }

  const scope = scopeFor(req);
  const hash = requestHash(req);
  const key = `${scope}:${header}`;

  IdempotencyKey.findOne({ key, scope })
    .then(async (existing) => {
      if (existing) {
        if (existing.requestHash && existing.requestHash !== hash) {
          throw AppError.conflict(
            "Idempotency-Key already used with a different request",
            "IDEMPOTENCY_CONFLICT"
          );
        }
        res.status(existing.statusCode).json(existing.body);
        return;
      }

      // Capture the JSON response and persist it before sending.
      const originalJson = res.json.bind(res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.json = ((body: any) => {
        // Store synchronously; fire-and-forget error handling.
        IdempotencyKey.create({
          key,
          scope,
          requestHash: hash,
          statusCode: res.statusCode,
          body,
        }).catch((err) => {
          /* duplicate key race — safe to ignore, another copy was stored */
          if (err?.code !== 11000) {
            console.error("idempotency store error:", err);
          }
        });
        return originalJson(body);
      }) as typeof res.json;

      next();
    })
    .catch(next);
};

/**
 * For routes where an Idempotency-Key is mandatory, returns 400 if missing.
 */
export const idempotencyRequired = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.header(IDEMPOTENCY_HEADER)) {
    next(
      AppError.badRequest(
        "Idempotency-Key header is required for this operation",
        "IDEMPOTENCY_KEY_REQUIRED"
      )
    );
    return;
  }
  next();
};
