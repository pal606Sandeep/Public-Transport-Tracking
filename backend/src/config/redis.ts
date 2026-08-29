import { Redis } from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

export const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
} as const;

const redisClient = new Redis(redisOptions);

redisClient.on("connect", () => {
  logger.info("Redis connected");
});

redisClient.on("error", (err: Error) => {
  logger.error(`Redis error: ${err.message}`);
});

export default redisClient;
export type RedisOptions = typeof redisOptions;