import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import redisClient from "./config/redis.js";
import { initSocket } from "./config/socket.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { rebuildTrackingState } from "./modules/tracking/state/rebuild.state.js";
import { startTripStatsConsumer } from "./modules/tracking/trip-stats.consumer.js";
import { startNotificationConsumer } from "./modules/notification/event-consumer.js";
import { startOccupancyConsumer } from "./modules/analytics/occupancy.consumer.js";
import { startMaintenanceJobRunner } from "./modules/maintenance/maintenance.job.js";
import { startIncidentConsumer } from "./modules/incident/incident.consumer.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const httpServer = http.createServer(app);

    const io = initSocket(httpServer);
    registerSocketHandlers(io);

    // Bind the port before the (slow) tracking-state rebuild so the host's
    // port scan / health check sees the service as up right away.
    httpServer.listen(Number(PORT), "0.0.0.0", () => {
      logger.info(`Server running on port ${PORT}`);
    });

    await rebuildTrackingState().catch((err: Error) => {
      logger.error(`Tracking state rebuild failed: ${err.message}`);
    });

    startTripStatsConsumer();
    startNotificationConsumer();
    startOccupancyConsumer();
    startMaintenanceJobRunner();
    startIncidentConsumer();

    process.on("SIGINT", async () => {
      await redisClient.quit();
      await closeDB();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await redisClient.quit();
      await closeDB();
      process.exit(0);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${(error as Error).message}`);
    process.exit(1);
  }
};

startServer();