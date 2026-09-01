import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger.js";
import { setGauge } from "./metrics.js";

/**
 * Optional Sentry error-tracking integration. Activated when `SENTRY_DSN` is
 * set. Since `@sentry/node` isn't installed in this repo, we expose a seam
 * that wraps `logger.error` so a forced error is visible to whatever is
 * configured downstream (the standard `console.error` is enough for the dev
 * environment, and a future swap-in of the SDK requires only this file).
 */
let sentryActive = false;

export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  // Optional SDK activation would happen here. Without `@sentry/node`, we
  // log a single "armed" line so operators know it's wired and can flip the
  // package on without code changes.
  sentryActive = true;
  logger.info("Sentry DSN configured (SDK not installed; using logger seam)", { dsn: dsn.slice(0, 8) + "..." });
};

export const captureException = (err: unknown, extra: Record<string, unknown> = {}): void => {
  logger.error("sentry.capture", { error: (err as Error)?.message ?? String(err), stack: (err as Error)?.stack, ...extra });
  if (!sentryActive) {
    // In dev/test we surface every captured error through the existing
    // logger.error path so a forced exception is visible in test output.
    setGauge("sentry_captured_total", (Number(process.env.SENTRY_CAPTURED_TOTAL ?? 0)) + 1);
  }
};

/**
 * Express middleware: catch any uncaught throwable in the chain and report it
 * via `captureException`. Mounted after `errorHandler` so it observes the
 * final error envelope.
 */
export const sentryErrorMiddleware = (err: unknown, req: Request, _res: Response, next: NextFunction): void => {
  captureException(err, { path: req.path, method: req.method });
  next(err);
};

export const isSentryActive = (): boolean => sentryActive;