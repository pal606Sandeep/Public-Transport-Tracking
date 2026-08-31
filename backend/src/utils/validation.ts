import { z } from "zod";
import { AppError } from "./AppError.js";
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "./asyncHandler.js";

/**
 * Map a ZodError into the `details` shape of the standard error envelope:
 * `{ field: [messages...] }` for each violating field.
 */
export const zodErrorDetails = (error: z.ZodError): Record<string, string[]> => {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "body";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
};

export const toAppError = (error: z.ZodError): AppError =>
  AppError.badRequest("Validation failed", "VALIDATION_ERROR", zodErrorDetails(error));

/**
 * Express middleware that validates `req.body` (or a given source) against a
 * zod schema, 400s with `VALIDATION_ERROR` + field details, else replaces the
 * source with the parsed result and calls next().
 */
export const validate =
  (schema: z.ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      next(toAppError(parsed.error));
      return;
    }
    // In Express 5 `req.query` / `req.params` are getter-only, so a plain
    // assignment throws. Redefine the property with the parsed value instead.
    if (source === "body") {
      (req as any).body = parsed.data;
    } else {
      Object.defineProperty(req, source, {
        value: parsed.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };

/**
 * Async version of `validate` for use inside `asyncHandler` (e.g. to be
 * executed after earlier async middleware, keeping a single error path).
 */
export const parseOrThrow = <T>(schema: z.ZodSchema<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw toAppError(parsed.error);
  return parsed.data;
};

export { asyncHandler };
