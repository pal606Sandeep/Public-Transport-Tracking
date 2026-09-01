import { Redis } from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
};

const parseRedisUrl = (): RedisConnectionOptions => {
  const url = process.env.REDIS_URL;

  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      username: decodeURIComponent(parsed.username) || undefined,
      password: decodeURIComponent(parsed.password) || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

export const redisOptions = {
  ...parseRedisUrl(),
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