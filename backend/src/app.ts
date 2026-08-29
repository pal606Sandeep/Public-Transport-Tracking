import express, { Express, Request, Response, Router } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { limiter } from "./middlewares/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { traceIdMiddleware } from "./middlewares/traceId.js";
import { apiResponse } from "./utils/apiResponse.js";
import { idempotent, idempotencyRequired } from "./middlewares/idempotency.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import rbacRoutes from "./modules/rbac/rbac.routes.js";
import configRoutes from "./modules/config/config.routes.js";
import { healthz, readyz } from "./modules/health/health.controller.js";
import { specRouter } from "./openapi/index.js";

import driverRoutes from "./modules/driver/driver.routes.js";
import vehicleRoutes from "./modules/vehicle/vehicle.routes.js";
import routeRoutes from "./modules/route/route.routes.js";
import stopRoutes from "./modules/stop/stop.routes.js";
import scheduleRoutes from "./modules/schedule/schedule.routes.js";
import tripRoutes from "./modules/trip/trip.routes.js";
import trackingRoutes from "./modules/tracking/tracking.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";

dotenv.config();

const app: Express = express();

app.use(helmet());
app.use(traceIdMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(limiter);

// P1-06 health checks (root-level, standard ops probes)
app.get("/healthz", healthz);
app.get("/readyz", readyz);

// liveness hosted under the API too (kept for backwards compatibility)
app.get("/api/v1/health", (_req: Request, res: Response) => {
  apiResponse(res, 200, true, "Health check", { status: "ok" });
});

// P1-04 idempotency demo route (exercises the idempotent middleware)
const demoRouter = Router();
demoRouter.post(
  "/idempotent",
  idempotencyRequired,
  idempotent,
  (req: Request, res: Response) => {
    apiResponse(res, 201, true, "Created", { received: req.body, at: Date.now() });
  }
);
app.use("/api/v1/demo", demoRouter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/rbac", rbacRoutes);
app.use("/api/v1", configRoutes); // /config + /time

app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/stops", stopRoutes);
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/tracking", trackingRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// OpenAPI spec + mock server (P1-18)
app.use("/api-docs", specRouter());

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
