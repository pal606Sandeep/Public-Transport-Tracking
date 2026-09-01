import { Request, Response, NextFunction } from "express";
import { observeHistogram, incCounter } from "../utils/metrics.js";

export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    const route = (req.route && req.route.path) || req.baseUrl + req.path || req.path || "unknown";
    const labels = { method: req.method, route, status: String(res.statusCode) };
    observeHistogram("http_request_duration_seconds", elapsed, labels);
    incCounter("http_requests_total", labels);
    if (res.statusCode >= 500) incCounter("http_requests_errors_total", labels);
  });
  next();
};