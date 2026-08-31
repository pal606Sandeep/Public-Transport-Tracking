import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD } from "./support.js";

/**
 * P2-27/P2-31 — no formally agreed load/security test plan exists yet
 * (P1-58 — "coordinate the overall load/security test plan + shared
 * tooling" — is still 0/4 on the Person 1 tracker), so there is no
 * externally agreed throughput/latency budget to test against. The budgets
 * below (RPS, p95 latency, WS connect time) are a reasonable baseline this
 * pass defines and documents — replace them once P1-58 lands with an
 * authoritative target. Security tests (spoofing/device-binding/rate-limit)
 * already exist in `tests/phase3-tracking.test.ts` (P2-26) — this file adds
 * only the missing throughput/connection-spike load coverage.
 */

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let httpServer: http.Server;
let baseUrl: string;
let adminToken: string;

const FLEET_SIZE = 15;
const ROUNDS = 3;
const P95_LATENCY_BUDGET_MS = 1500;
const MIN_SUSTAINED_RPS = 5;

const WS_SPIKE_SIZE = 60;
const WS_P95_CONNECT_BUDGET_MS = 2000;

interface FleetMember {
  vehicleId: string;
  driverId: string;
  driverToken: string;
  tripId: string;
  tsCursor: number;
  lat: number;
  lng: number;
}

const fleet: FleetMember[] = [];
let routeId = "";

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

beforeAll(async () => {
  const b = await boot();
  req = b.request;

  const { default: app } = await import("../src/app.js");
  const { initSocket } = await import("../src/config/socket.js");
  httpServer = http.createServer(app);
  initSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;

  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);

  const stop = await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Load Test Stop", location: { type: "Point", coordinates: [77.0, 12.0] } })
    .expect(201);

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: `LOAD-${Date.now()}`,
      geometry: {
        type: "LineString",
        coordinates: [
          [77.0, 12.0],
          [77.2, 12.2],
        ],
      },
      orderedStops: [{ stopId: stop.body.data.stop._id, sequence: 0, scheduledOffsetMinutes: 0 }],
    })
    .expect(201);
  routeId = route.body.data.route._id;

  for (let i = 0; i < FLEET_SIZE; i++) {
    const email = `load-driver-${i}@test.com`;
    await req.post("/api/v1/auth/register").send({ name: `Load Driver ${i}`, email, password: "LoadPass123!", role: "DRIVER" });
    const driverToken = await loginToken(req, email, "LoadPass123!");
    const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${driverToken}`);

    const driverRes = await req
      .post("/api/v1/admin/drivers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ user: me.body.data.user._id, name: `Load Driver ${i}`, employeeId: `LOAD-EMP-${i}`, licenseNumber: `LOAD-LIC-${i}` })
      .expect(201);
    const driverId = driverRes.body.data.driver._id;

    const vehRes = await req
      .post("/api/v1/admin/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ registrationNumber: `LOAD-${i}-${Date.now()}`, model: "Load Bus", type: "STANDARD", capacity: 40 })
      .expect(201);
    const vehicleId = vehRes.body.data.vehicle._id;

    const tripRes = await req
      .post("/api/v1/admin/trips")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        route: routeId,
        vehicle: vehicleId,
        scheduledStartAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        scheduledEndAt: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
      })
      .expect(201);
    const tripId = tripRes.body.data.trip._id;

    await req
      .post(`/api/v1/admin/trips/${tripId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId, vehicleId, conductorId: null })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${tripId}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    fleet.push({ vehicleId, driverId, driverToken, tripId, tsCursor: Date.now() - 60_000, lat: 12.0, lng: 77.0 });
  }
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await shutdown();
});

describe("P2-27/P2-31 — Tracking performance: sustained GPS ingestion throughput", () => {
  it(`sustains ${FLEET_SIZE} vehicles x ${ROUNDS} rounds of concurrent GPS ingestion within budget (p95 < ${P95_LATENCY_BUDGET_MS}ms, >= ${MIN_SUSTAINED_RPS} RPS)`, async () => {
    const latencies: number[] = [];
    let accepted = 0;
    let rejected = 0;
    const wallStart = Date.now();

    for (let round = 0; round < ROUNDS; round++) {
      const results = await Promise.all(
        fleet.map(async (m) => {
          m.tsCursor += 6000;
          m.lat += 0.0005;
          m.lng += 0.0005;
          const start = Date.now();
          const res = await req
            .post("/api/v1/tracking/location")
            .set("Authorization", `Bearer ${m.driverToken}`)
            .send({
              vehicleId: m.vehicleId,
              tripId: m.tripId,
              driverId: m.driverId,
              latitude: m.lat,
              longitude: m.lng,
              speed: 20,
              heading: 45,
              accuracy: 5,
              timestamp: m.tsCursor,
            });
          return { status: res.status, latency: Date.now() - start };
        })
      );
      for (const r of results) {
        latencies.push(r.latency);
        if (r.status === 202) accepted++;
        else rejected++;
      }
    }

    const wallSeconds = (Date.now() - wallStart) / 1000;
    const totalRequests = FLEET_SIZE * ROUNDS;
    const achievedRPS = totalRequests / wallSeconds;
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = percentile(sorted, 95);

    // eslint-disable-next-line no-console
    console.log(
      `[P2-27/P2-31 load] ${totalRequests} requests in ${wallSeconds.toFixed(2)}s ` +
        `(${achievedRPS.toFixed(1)} RPS), accepted=${accepted} rejected=${rejected}, ` +
        `p50=${percentile(sorted, 50)}ms p95=${p95}ms p99=${percentile(sorted, 99)}ms`
    );

    expect(rejected).toBe(0);
    expect(accepted).toBe(totalRequests);
    expect(p95).toBeLessThan(P95_LATENCY_BUDGET_MS);
    expect(achievedRPS).toBeGreaterThanOrEqual(MIN_SUSTAINED_RPS);
  }, 30_000);
});

describe("P2-27/P2-31 — Tracking performance: WebSocket connection-spike handling", () => {
  it(`handles a spike of ${WS_SPIKE_SIZE} concurrent socket connections + subscriptions within budget (p95 < ${WS_P95_CONNECT_BUDGET_MS}ms)`, async () => {
    // Socket auth doesn't dedupe by token, so a handful of guest tokens
    // round-robined across connections is enough to stress the Socket.IO
    // layer itself without tripping the global per-IP REST rate limiter
    // (which the concurrent-GPS test above already spent a chunk of).
    const GUEST_TOKEN_POOL = 5;
    const guests = await Promise.all(
      Array.from({ length: GUEST_TOKEN_POOL }, () => req.post("/api/v1/auth/guest").expect(200))
    );
    const tokens = guests.map((g) => g.body.data.token as string);

    const connectLatencies: number[] = [];
    const sockets: ClientSocket[] = [];

    await Promise.all(
      Array.from({ length: WS_SPIKE_SIZE }, (_, i) => i).map(
        (i) =>
          new Promise<void>((resolve, reject) => {
            const start = Date.now();
            const socket = ioClient(baseUrl, {
              auth: { token: tokens[i % tokens.length] },
              transports: ["websocket"],
              forceNew: true,
            });
            socket.once("connect", () => {
              connectLatencies.push(Date.now() - start);
              sockets.push(socket);
              socket.emit("subscribe", { vehicleId: `spike-vehicle-${i % FLEET_SIZE}` }, () => resolve());
            });
            socket.once("connect_error", reject);
          })
      )
    );

    try {
      expect(sockets.length).toBe(WS_SPIKE_SIZE);
      const sorted = [...connectLatencies].sort((a, b) => a - b);
      const p95 = percentile(sorted, 95);
      // eslint-disable-next-line no-console
      console.log(
        `[P2-27/P2-31 WS spike] ${WS_SPIKE_SIZE} connections, ` +
          `p50=${percentile(sorted, 50)}ms p95=${p95}ms max=${sorted[sorted.length - 1]}ms`
      );
      expect(p95).toBeLessThan(WS_P95_CONNECT_BUDGET_MS);

      // Fan-out sanity: a broadcast to one vehicle room reaches only that room's socket, not the other 59.
      const { broadcastToVehicle } = await import("../src/config/socket.js");
      const target = sockets[0];
      const bystander = sockets[1];
      const targetGot = new Promise((resolve) => target.once("vehicle:location", resolve));
      let bystanderGot = false;
      bystander.once("vehicle:location", () => (bystanderGot = true));
      broadcastToVehicle("spike-vehicle-0", "vehicle:location", { vehicleId: "spike-vehicle-0" });
      await targetGot;
      await new Promise((r) => setTimeout(r, 200));
      expect(bystanderGot).toBe(false);
    } finally {
      sockets.forEach((s) => s.disconnect());
    }
  }, 30_000);
});
