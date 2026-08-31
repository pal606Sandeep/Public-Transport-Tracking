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
import userAdminRoutes from "./modules/user/userAdmin.routes.js";
import passengerRoutes, { adminPassengerRouter } from "./modules/passenger/passenger.routes.js";
import { adminDriverRouter, driverUserRouter } from "./modules/driver/driver.routes.js";
import { adminConductorRouter } from "./modules/conductor/conductor.routes.js";
import rbacRoutes from "./modules/rbac/rbac.routes.js";
import configRoutes from "./modules/config/config.routes.js";
import { healthz, readyz } from "./modules/health/health.controller.js";
import { specRouter } from "./openapi/index.js";

import { adminVehicleRouter, publicVehicleRouter } from "./modules/vehicle/vehicle.routes.js";
import { adminRouteRouter, publicRouteRouter } from "./modules/route/route.routes.js";
import { adminStopRouter, publicStopRouter } from "./modules/stop/stop.routes.js";
import { adminScheduleRouter } from "./modules/schedule/schedule.routes.js";
import { adminRouter, staffRouter } from "./modules/trip/trip.routes.js";
import { meRouter, adminRequestRouter } from "./modules/me/me.routes.js";
import syncRoutes from "./modules/sync/sync.routes.js";
import uploadRoutes from "./modules/uploads/uploads.routes.js";
import trackingRoutes from "./modules/tracking/tracking.routes.js";
import gtfsRealtimeRoutes from "./modules/tracking/gtfs/gtfs-rt.routes.js";
import notificationRoutes, { adminNotificationRouter } from "./modules/notification/notification.routes.js";
import { discoveryRouter, journeyRouter } from "./modules/discovery/discovery.routes.js";
import { adminServiceAlertRouter, publicServiceAlertRouter } from "./modules/serviceAlert/serviceAlert.routes.js";
import { complaintRouter, adminComplaintRouter } from "./modules/complaint/complaint.routes.js";
import { lostFoundRouter, adminLostFoundRouter } from "./modules/lostFound/lostFound.routes.js";

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
app.use("/api/v1/admin/users", userAdminRoutes);
app.use("/api/v1/passengers", passengerRoutes);
app.use("/api/v1/admin/passengers", adminPassengerRouter);
app.use("/api/v1/drivers", driverUserRouter);
app.use("/api/v1/admin/drivers", adminDriverRouter);
app.use("/api/v1/admin/conductors", adminConductorRouter);
app.use("/api/v1/admin/vehicles", adminVehicleRouter);
app.use("/api/v1/admin/stops", adminStopRouter);
app.use("/api/v1/admin/routes", adminRouteRouter);
app.use("/api/v1/admin/schedules", adminScheduleRouter);
app.use("/api/v1/admin/trips", adminRouter);
app.use("/api/v1/trips", staffRouter);
app.use("/api/v1/admin/assignment-requests", adminRequestRouter);
app.use("/api/v1/me", meRouter);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/rbac", rbacRoutes);
app.use("/api/v1", configRoutes); // /config + /time

app.use("/api/v1/vehicles", publicVehicleRouter);
app.use("/api/v1/routes", publicRouteRouter);
app.use("/api/v1/stops", publicStopRouter);
app.use("/api/v1/tracking", trackingRoutes);
app.use("/api/v1/gtfs/realtime", gtfsRealtimeRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/admin/notification-templates", adminNotificationRouter);
app.use("/api/v1/discovery", discoveryRouter);
app.use("/api/v1/journeys", journeyRouter);
app.use("/api/v1/admin/service-alerts", adminServiceAlertRouter);
app.use("/api/v1/service-alerts", publicServiceAlertRouter);
app.use("/api/v1/complaints", complaintRouter);
app.use("/api/v1/admin/complaints", adminComplaintRouter);
app.use("/api/v1/lost-found", lostFoundRouter);
app.use("/api/v1/admin/lost-found", adminLostFoundRouter);

// OpenAPI spec + mock server (P1-18)
app.use("/api-docs", specRouter());

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
