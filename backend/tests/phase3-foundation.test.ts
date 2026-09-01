import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { boot, shutdown } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let mongoUri: string;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  mongoUri = b.uri;
});

afterAll(async () => {
  await shutdown();
});

describe("P2-01 — Tracking service/worker setup & foundations", () => {
  it("@turf/* imports resolve and compute against a simple LineString", async () => {
    const length = (await import("@turf/length")).default;
    const lineSlice = (await import("@turf/line-slice")).default;
    const pointToLineDistance = (await import("@turf/point-to-line-distance")).default;
    const nearestPointOnLine = (await import("@turf/nearest-point-on-line")).default;
    const bearing = (await import("@turf/bearing")).default;
    const { point, lineString } = await import("@turf/helpers");

    const line = lineString([
      [77.0, 12.0],
      [77.1, 12.1],
    ]);
    expect(length(line, { units: "kilometers" })).toBeGreaterThan(0);

    const start = point([77.0, 12.0]);
    const end = point([77.05, 12.05]);
    const sliced = lineSlice(start, end, line);
    expect(sliced.geometry.coordinates.length).toBeGreaterThanOrEqual(2);

    const off = point([77.05, 12.06]);
    expect(pointToLineDistance(off, line, { units: "meters" })).toBeGreaterThan(0);
    expect(nearestPointOnLine(line, off).geometry.type).toBe("Point");
    expect(typeof bearing(start, end)).toBe("number");
  });

  it("tracking config loads with gps/geofence/eta/delay/queue sections", async () => {
    const { trackingConfig } = await import("../src/modules/tracking/config/tracking.config.js");
    expect(trackingConfig.gps.sendIntervalSeconds).toBeGreaterThan(0);
    expect(trackingConfig.geofence.defaultRadiusMeters).toBeGreaterThan(0);
    expect(trackingConfig.eta.thresholds.severe).toBeGreaterThan(0);
    expect(trackingConfig.delay.thresholds.severe).toBeGreaterThan(0);
  });

  it("shares access to Mongo + Redis clients from the tracking module", async () => {
    const redisClient = (await import("../src/config/redis.js")).default;
    expect(await redisClient.ping()).toBe("PONG");
    const mongoose = (await import("mongoose")).default;
    expect(mongoose.connection.readyState).toBe(1); // connected
  });

  it("tracking routes are mounted under /api/v1/tracking (auth-gated, not 404)", async () => {
    await req.post("/api/v1/tracking/location").send({}).expect(401);
    await req.get("/api/v1/tracking/vehicle/does-not-exist").expect(401); // guestOrAuth requires *some* token
  });

  it("the worker entrypoint boots against the shared Mongo + Redis and starts all queues", async () => {
    const workerEntry = path.resolve(__dirname, "../src/worker.ts");
    const child: ChildProcessWithoutNullStreams = spawn(
      process.execPath,
      [path.resolve(__dirname, "../node_modules/tsx/dist/cli.mjs"), workerEntry],
      {
        cwd: path.resolve(__dirname, ".."),
        env: {
          ...process.env,
          MONGO_URI: mongoUri,
          NODE_ENV: "test",
          JWT_SECRET: "test-secret-please-change",
        },
      }
    );

    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.stderr.on("data", (d) => (output += d.toString()));

    const started = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 15000);
      const check = setInterval(() => {
        if (output.includes("All tracking workers started")) {
          clearTimeout(timer);
          clearInterval(check);
          resolve(true);
        }
      }, 200);
    });

    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      setTimeout(resolve, 3000);
    });

    expect(output).toContain("Starting tracking worker process");
    expect(started).toBe(true);
    expect(output).not.toContain("Failed to start tracking worker");
  }, 20000);
});
