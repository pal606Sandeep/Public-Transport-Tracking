import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import { connectDB, closeDB } from "./config/db.js";
import redisClient from "./config/redis.js";
import { initSocket } from "./config/socket.js";
import { registerSocketHandlers } from "./sockets/index.js";
import { rebuildTrackingState } from "./modules/tracking/state/rebuild.state.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    // P2-03 — Redis is never the source of truth; repopulate it from Mongo
    // on every boot so a Redis flush + restart doesn't lose active state.
    await rebuildTrackingState().catch((err: Error) => {
      logger.error(`Tracking state rebuild failed: ${err.message}`);
    });

    const httpServer = http.createServer(app);

    const io = initSocket(httpServer);
    registerSocketHandlers(io);

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

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