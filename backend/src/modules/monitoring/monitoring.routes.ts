import { Request, Response, Router } from "express";
import { exposeMetrics, registerDefaultMetrics } from "../../utils/metrics.js";
import mongoose from "mongoose";
import redisClient from "../../config/redis.js";
import { setGauge, incCounter, observeHistogram } from "../../utils/metrics.js";

registerDefaultMetrics();

/**
 * `GET /metrics` — Prometheus exposition. No auth: scrape from inside the
 * cluster only (network policy) or behind an ops-side auth proxy.
 *
 * Backgrounded `mongo_up` + `redis_up` gauges are refreshed before serving so
 * a fresh scrape shows the current connection state.
 */
const router = Router();
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  setGauge("mongo_up", mongoose.connection.readyState === 1 ? 1 : 0);
  setGauge("redis_up", redisClient.status === "ready" ? 1 : 0);
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.status(200).send(exposeMetrics());
});

export default router;
export { incCounter, observeHistogram, setGauge };