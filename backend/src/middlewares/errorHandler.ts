import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { zodErrorDetails } from "../utils/validation.js";
import logger from "../utils/logger.js";

const isMongooseError = (
  err: object & { name?: string }
): err is { name: string; message: string; errors?: Record<string, { message: string }> } =>
  err instanceof Error && (err.name === "ValidationError" || err.name === "CastError");

const unknownErrorCode = "INTERNAL_ERROR";

/**
 * Centralized error handler. Produces the standard envelope:
 * `{ error: { code, message, details?, traceId } }`.
 * Never leaks internal stack traces to clients.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const traceId = res.locals.traceId || "unknown";

  // zod validation errors
  if (err instanceof ZodError) {
    const appErr = AppError.badRequest(
      "Validation failed",
      "VALIDATION_ERROR",
      zodErrorDetails(err)
    );
    res.status(400).json({
      error: {
        code: appErr.code,
        message: appErr.message,
        details: appErr.details,
        traceId,
      },
    });
    return;
  }

  // mongoose validation / cast errors
  if (
    err instanceof Error &&
    (err as { name?: string }).name === "ValidationError"
  ) {
    const details = (err as { errors?: Record<string, { message: string }> }).errors;
    const mapped = details
      ? Object.fromEntries(
          Object.entries(details).map(([k, v]) => [k, [v.message]])
        )
      : undefined;
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: err.message, details: mapped, traceId },
    });
    return;
  }

  if (
    err instanceof Error &&
    (err as { name?: string }).name === "CastError"
  ) {
    res.status(400).json({
      error: { code: "INVALID_ID", message: err.message, traceId },
    });
    return;
  }

  // deliberate domain errors
  if (err instanceof AppError) {
    logger.error(`${err.message} [${err.code}]`);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        traceId,
      },
    });
    return;
  }

  // unexpected errors — log full stack server-side, but never expose it
  const message = err instanceof Error ? err.message : "Internal Server Error";
  logger.error(
    `Unhandled error: ${message}\n${err instanceof Error ? err.stack : ""}`
  );
  res.status(500).json({
    error: { code: unknownErrorCode, message: "Internal Server Error", traceId },
  });
};

/** Matches any unmounted route and hands a 404 AppError to the error handler. */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  next(
    AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)
  );
};
