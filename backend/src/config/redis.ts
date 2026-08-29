import { Redis } from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("connect", () => {
  logger.info("Redis connected");
});

redisClient.on("error", (err: Error) => {
  logger.error(`Redis error: ${err.message}`);
});

export default redisClient;