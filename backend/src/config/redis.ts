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

export const createRedisClient = (name = "default"): Redis => {
  const client = new Redis({
    ...redisOptions,
    connectionName: name,
  });

  client.on("connect", () => {
    logger.info(`Redis ${name} connected`);
  });

  client.on("error", (err: Error) => {
    logger.error(`Redis ${name} error: ${err.message}`);
  });

  return client;
};

const redisClient = createRedisClient("main");

export default redisClient;
export type RedisOptions = typeof redisOptions;