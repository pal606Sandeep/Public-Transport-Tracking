import { describe, it, expect, beforeAll, afterAll } from "vitest";
import redisClient from "../src/config/redis.js";
import logger from "../src/utils/logger.js";

describe("P1-03 — Redis connection", () => {
  beforeAll(async () => {
    // Ensure a connection is established before running assertions.
    await redisClient.ping();
  });

  afterAll(async () => {
    logger.info("P1-03 test teardown: quit redis");
    await redisClient.quit();
  });

  it("connects and answers PING → PONG", () => {
    expect(redisClient.status).toBe("ready");
  });

  it("can set/get a value (non-authoritative cache read/write)", async () => {
    await redisClient.set("p1-03-probe", "ok", "EX", 60);
    const val = await redisClient.get("p1-03-probe");
    expect(val).toBe("ok");
    await redisClient.del("p1-03-probe");
  });
});
