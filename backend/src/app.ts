import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { limiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { apiResponse } from "./utils/apiResponse.js";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(limiter);

app.get("/api/v1/health", (req: Request, res: Response) => {
  apiResponse(res, 200, true, "Health check", { status: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/stops", stopRoutes);
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/tracking", trackingRoutes);
app.use("/api/v1/notifications", notificationRoutes);

app.use(errorHandler);

export default app;