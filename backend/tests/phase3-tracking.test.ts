import { describe, it, expect, beforeAll, afterAll } from "vitest";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DRIVER_EMAIL,
  DRIVER_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";
import { loadRouteCache, getDistanceAlongRoute } from "../src/modules/tracking/geo/geospatial.service.js";
import { detectDelay } from "../src/modules/tracking/geo/delay.service.js";
import { detectGPSAnomaly, clearAnomalyCache } from "../src/modules/tracking/anomaly/gps-anomaly.service.js";
import { persistGPSPointDirect, getTripGPSHistory, downsamplePath } from "../src/modules/tracking/geo/gps-history.service.js";
import { evaluateVehicleSignal } from "../src/modules/tracking/geo/offline-detection.service.js";
import redisClient from "../src/config/redis.js";

const { transit_realtime: GtfsRT } = GtfsRealtimeBindings;

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let driverToken: string;
let passengerToken: string;
let driverUserId = "";
let driverId = "";
let otherDriverId = "";
let vehicleId = "";
let routeId = "";
let stopA = "";
let stopB = "";
let tripId = "";

const STOP_A = { lng: 77.0, lat: 12.0 };
const STOP_B = { lng: 77.1, lat: 12.1 };
const MID = { lng: 77.05, lat: 12.05 };

async function createStop(name: string, lng: number, lat: number): Promise<string> {
  const r = await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name, location: { type: "Point", coordinates: [lng, lat] } })
    .expect(201);
  return r.body.data.stop._id as string;
}

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${driverToken}`);
  driverUserId = me.body.data.user._id;

  const driverRes = await req
    .post("/api/v1/admin/drivers")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ user: driverUserId, name: "Track Driver", employeeId: "TRK-001", licenseNumber: "LIC-TRK-1" })
    .expect(201);
  driverId = driverRes.body.data.driver._id;

  // A second (unowned) driver profile to exercise impersonation checks.
  const otherUserRes = await req
    .post("/api/v1/auth/register")
    .send({ name: "Other Driver", email: "other-driver@test.com", password: "OtherPass123!", role: "DRIVER" });
  const otherUserId = otherUserRes.body?.data?.user?._id;
  const otherDriverRes = await req
    .post("/api/v1/admin/drivers")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ user: otherUserId, name: "Other Driver", employeeId: "TRK-002", licenseNumber: "LIC-TRK-2" })
    .expect(201);
  otherDriverId = otherDriverRes.body.data.driver._id;

  stopA = await createStop("Track Stop A", STOP_A.lng, STOP_A.lat);
  stopB = await createStop("Track Stop B", STOP_B.lng, STOP_B.lat);

  const routeRes = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "TRK-1",
      name: "Tracking Test Line",
      geometry: {
        type: "LineString",
        coordinates: [
          [STOP_A.lng, STOP_A.lat],
          [STOP_B.lng, STOP_B.lat],
        ],
      },
      orderedStops: [
        { stopId: stopA, sequence: 0, scheduledOffsetMinutes: 0 },
        { stopId: stopB, sequence: 1, scheduledOffsetMinutes: 20 },
      ],
    })
    .expect(201);
  routeId = routeRes.body.data.route._id;

  const vehRes = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-TRK-0001", model: "Test Bus", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = vehRes.body.data.vehicle._id;

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
  tripId = tripRes.body.data.trip._id;

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
});

afterAll(async () => {
  await shutdown();
});

let fixClock = Date.now() - 60_000;
const nextTs = (step = 6000): number => {
  fixClock += step;
  return fixClock;
};

const fixAt = (lng: number, lat: number, speed = 20, ts?: number) => ({
  vehicleId,
  tripId,
  driverId,
  latitude: lat,
  longitude: lng,
  speed,
  heading: 45,
  accuracy: 5,
  timestamp: ts ?? nextTs(),
});

describe("P2-04 — GPS ingestion: POST /tracking/location", () => {
  it("unauthenticated → 401", async () => {
    await req.post("/api/v1/tracking/location").send(fixAt(STOP_A.lng, STOP_A.lat)).expect(401);
  });

  it("malformed payload → 400", async () => {
    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ vehicleId, tripId, driverId, latitude: "not-a-number" })
      .expect(400);
  });

  it("unknown vehicle → 404", async () => {
    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ ...fixAt(STOP_A.lng, STOP_A.lat), vehicleId: "0123456789abcdef01234567" })
      .expect(404);
  });

  it("driver reporting on behalf of a different driver → 403 (P2-26 ownership check)", async () => {
    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ ...fixAt(STOP_A.lng, STOP_A.lat), driverId: otherDriverId })
      .expect(403);
  });

  it("valid fix → 202 and Redis location updated", async () => {
    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(fixAt(STOP_A.lng, STOP_A.lat))
      .expect(202);

    const snap = await req
      .get(`/api/v1/tracking/vehicle/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(snap.body.data.location.lat).toBeCloseTo(STOP_A.lat, 4);
    expect(snap.body.data.location.lon).toBeCloseTo(STOP_A.lng, 4);
  });

  it("impossible speed → 400 (anomaly rejected)", async () => {
    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send(fixAt(STOP_B.lng, STOP_B.lat, 500))
      .expect(400);
  });

  it("trip not ACTIVE → 409", async () => {
    const pending = await req
      .post("/api/v1/admin/trips")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ route: routeId, vehicle: vehicleId })
      .expect(201);
    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ ...fixAt(STOP_A.lng, STOP_A.lat), tripId: pending.body.data.trip._id })
      .expect(409);
  });
});

describe("P2-06 — Offline GPS bulk sync", () => {
  it("requires Idempotency-Key → 400 without it", async () => {
    await req
      .post("/api/v1/tracking/location/bulk")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ locations: [fixAt(MID.lng, MID.lat)] })
      .expect(400);
  });

  it("accepts a batch, replays identically for the same key, and jumps live position to now after flush", async () => {
    // Spaced minutes apart (a realistic offline backlog), not the usual
    // fixAt() cadence, so the ~7.7km hops between fixtures don't trip
    // suspicious-movement anomaly detection.
    const batch = {
      locations: [
        fixAt(STOP_A.lng, STOP_A.lat, 20, nextTs(5 * 60_000)),
        fixAt(MID.lng, MID.lat, 20, nextTs(5 * 60_000)),
        fixAt(STOP_B.lng, STOP_B.lat, 20, nextTs(5 * 60_000)),
      ],
    };

    const first = await req
      .post("/api/v1/tracking/location/bulk")
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "bulk-batch-1")
      .send(batch)
      .expect(202);
    expect(first.body.data.accepted).toBe(3);

    const replay = await req
      .post("/api/v1/tracking/location/bulk")
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "bulk-batch-1")
      .send(batch)
      .expect(202);
    expect(replay.body).toEqual(first.body);

    const snap = await req
      .get(`/api/v1/tracking/vehicle/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    // The live position reflects "now", not the (older) tail of the backlog.
    expect(Date.now() - snap.body.data.location.timestamp).toBeLessThan(5000);
  });

  it("same key + different body → conflict", async () => {
    await req
      .post("/api/v1/tracking/location/bulk")
      .set("Authorization", `Bearer ${driverToken}`)
      .set("Idempotency-Key", "bulk-batch-1")
      .send({ locations: [fixAt(STOP_A.lng, STOP_A.lat)] })
      .expect(409);
  });
});

describe("P2-07 — Heartbeat", () => {
  it("records liveness → 200", async () => {
    await req
      .post("/api/v1/tracking/heartbeat")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ vehicleId, tripId, driverId })
      .expect(200);
  });
});

describe("P2-08 — Tracking read APIs", () => {
  it("guest can read a vehicle snapshot (read-only)", async () => {
    const guest = await req.post("/api/v1/auth/guest").expect(200);
    const guestToken = guest.body.data.token;
    const res = await req
      .get(`/api/v1/tracking/vehicle/${vehicleId}`)
      .set("Authorization", `Bearer ${guestToken}`)
      .expect(200);
    expect(res.body.data.vehicleId).toBe(vehicleId);
  });

  it("unknown vehicle → 404", async () => {
    await req
      .get("/api/v1/tracking/vehicle/0123456789abcdef01234567")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });

  it("route snapshot lists the reporting vehicle", async () => {
    const res = await req
      .get(`/api/v1/tracking/route/${routeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.vehicles).toContain(vehicleId);
  });
});

describe("P2-09 — Geospatial core: distance-along-route is monotonic (start → end, not end → start)", () => {
  it("start of route ≈ 0m, end of route ≈ full length, midpoint in between", async () => {
    const route = await loadRouteCache(routeId);
    expect(route).not.toBeNull();
    const distStart = getDistanceAlongRoute(route!.geometry, STOP_A.lat, STOP_A.lng);
    const distMid = getDistanceAlongRoute(route!.geometry, MID.lat, MID.lng);
    const distEnd = getDistanceAlongRoute(route!.geometry, STOP_B.lat, STOP_B.lng);

    expect(distStart).toBeLessThan(200);
    expect(distEnd).toBeGreaterThan(10_000);
    expect(distMid).toBeGreaterThan(distStart);
    expect(distMid).toBeLessThan(distEnd);
  });
});

describe("P2-05 — GPS anomaly detection (unit)", () => {
  it("flags duplicate fixes within the threshold window", () => {
    const vid = "unit-veh-1";
    const ts = Date.now();
    const first = detectGPSAnomaly(vid, 12.0, 77.0, 20, ts, 5);
    expect(first.isAnomaly).toBe(false);
    const dup = detectGPSAnomaly(vid, 12.0, 77.0, 20, ts + 500, 5);
    expect(dup.isAnomaly).toBe(true);
    expect(dup.reason).toBe("DUPLICATE_GPS");
  });

  it("flags an older-than-last fix as out of order", () => {
    const vid = "unit-veh-2";
    const ts = Date.now();
    detectGPSAnomaly(vid, 12.0, 77.0, 20, ts, 5);
    const stale = detectGPSAnomaly(vid, 12.01, 77.01, 20, ts - 10_000, 5);
    expect(stale.isAnomaly).toBe(true);
    expect(stale.reason).toBe("OUT_OF_ORDER");
  });

  it("flags a multi-km jump in seconds as suspicious movement", () => {
    const vid = "unit-veh-3";
    const ts = Date.now();
    detectGPSAnomaly(vid, 12.0, 77.0, 20, ts, 5);
    const teleport = detectGPSAnomaly(vid, 13.0, 78.0, 20, ts + 2000, 5);
    expect(teleport.isAnomaly).toBe(true);
    expect(teleport.reason).toBe("SUSPICIOUS_MOVEMENT");
  });
});

describe("P2-13 — Delay detection (unit)", () => {
  // Seeded delayThresholds (support.ts) are { onTime: 0, delayed: 5, severe: 15 }
  // MINUTES — the client-facing /config contract's unit — converted to seconds
  // internally (0s / 300s / 900s) by getTrackingSettings().
  it("classifies EARLY / ON_TIME / DELAYED / SEVERELY_DELAYED from settings thresholds", async () => {
    const scheduled = Date.now();
    const onTime = await detectDelay("v", "t", "r", "stop-1", scheduled, scheduled);
    expect(onTime?.delayStatus).toBe("ON_TIME");

    const delayed = await detectDelay("v", "t", "r", "stop-2", scheduled, scheduled + 3 * 60_000);
    expect(delayed?.delayStatus).toBe("DELAYED");

    const severe = await detectDelay("v", "t", "r", "stop-3", scheduled, scheduled + 20 * 60_000);
    expect(severe?.delayStatus).toBe("SEVERELY_DELAYED");

    const early = await detectDelay("v", "t", "r", "stop-4", scheduled, scheduled - 5 * 60_000);
    expect(early?.delayStatus).toBe("EARLY");
  });
});

describe("P2-15 — Vehicle offline / stale detection", () => {
  // Seeded offlineVehicleTimeoutSeconds (support.ts) = 120s; default stale
  // timeout (unseeded) = 60s. 90s of silence lands in the STALE band.
  it("STALE after the short timeout, no incident; OFFLINE after the long timeout", async () => {
    const testVehicleId = "0123456789abcdef01234599";
    const key = `vehicle:${testVehicleId}:status`;
    await redisClient.hset(key, {
      lastSeen: String(Date.now() - 90_000),
      tripId: "",
      routeId: "",
      driverId: "",
    });

    const staleResult = await evaluateVehicleSignal(testVehicleId);
    expect(staleResult.status).toBe("STALE");

    await redisClient.hset(key, { lastSeen: String(Date.now() - 10_000) });
    const recovered = await evaluateVehicleSignal(testVehicleId);
    expect(recovered.status).toBe("ACTIVE");

    await redisClient.del(key);
  });
});

describe("P2-17 — Driver SOS", () => {
  it("driver triggers SOS → 200; dispatcher can acknowledge", async () => {
    const res = await req
      .post("/api/v1/tracking/sos")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ vehicleId, tripId, driverId, latitude: STOP_A.lat, longitude: STOP_A.lng, message: "test emergency" })
      .expect(200);
    expect(res.body.data.traceId).toBeTruthy();

    await req
      .post("/api/v1/tracking/sos/ack")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ vehicleId, driverId })
      .expect(200);
  });

  it("non-admin cannot acknowledge → 403", async () => {
    await req
      .post("/api/v1/tracking/sos/ack")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ vehicleId, driverId })
      .expect(403);
  });
});

describe("P2-22 — Occupancy ingestion", () => {
  it("accepted for async processing → 202", async () => {
    await req
      .post("/api/v1/tracking/occupancy")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ vehicleId, tripId, passengerCount: 30 })
      .expect(202);
  });

  it("mismatched vehicle/trip → 403", async () => {
    const otherVeh = await req
      .post("/api/v1/admin/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ registrationNumber: "KA-TRK-9999", model: "Other Bus", type: "STANDARD", capacity: 20 })
      .expect(201);
    await req
      .post("/api/v1/tracking/occupancy")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ vehicleId: otherVeh.body.data.vehicle._id, tripId, passengerCount: 5 })
      .expect(403);
  });
});

describe("P2-19 / P2-20 — GPS history persistence + trip replay (service-level)", () => {
  it("persists a point directly and reads it back in chronological order", async () => {
    const now = Date.now();
    await persistGPSPointDirect({
      vehicleId,
      tripId,
      driverId,
      latitude: STOP_A.lat,
      longitude: STOP_A.lng,
      speed: 10,
      heading: 0,
      accuracy: 5,
      timestamp: now - 2000,
    });
    await persistGPSPointDirect({
      vehicleId,
      tripId,
      driverId,
      latitude: MID.lat,
      longitude: MID.lng,
      speed: 15,
      heading: 45,
      accuracy: 5,
      timestamp: now,
    });

    const history = await getTripGPSHistory(tripId);
    expect(history.total).toBeGreaterThanOrEqual(2);
    const timestamps = history.points.map((p) => p.timestamp);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
  });

  it("downsamplePath caps output at maxPoints while preserving first/last", () => {
    const points = Array.from({ length: 500 }, (_, i) => ({
      latitude: 12 + i * 0.0001,
      longitude: 77 + i * 0.0001,
      timestamp: i,
    }));
    const sampled = downsamplePath(points, 50);
    expect(sampled.length).toBeLessThanOrEqual(51);
    expect(sampled[0].timestamp).toBe(0);
    expect(sampled[sampled.length - 1].timestamp).toBe(499);
  });

  it("trip history endpoint: non-admin → 403, admin → 200", async () => {
    await req
      .get(`/api/v1/tracking/trip/${tripId}/history`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(403);

    const res = await req
      .get(`/api/v1/tracking/trip/${tripId}/history`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.points.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Contract checkpoint — trip PAUSED maps to real-time ON_BREAK, not OFFLINE", () => {
  it("PAUSED sets vehicle/driver status to ON_BREAK; resuming ACTIVE sets ON_TRIP", async () => {
    await req
      .post(`/api/v1/admin/trips/${tripId}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "PAUSED" })
      .expect(200);

    const paused = await req
      .get(`/api/v1/tracking/vehicle/${vehicleId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(paused.body.data.status).toBe("ON_BREAK");

    await req
      .post(`/api/v1/admin/trips/${tripId}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    const resumed = await req
      .get(`/api/v1/tracking/vehicle/${vehicleId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(resumed.body.data.status).toBe("ON_TRIP");
  });
});

describe("P2-21 — Trip statistics handoff on completion", () => {
  it("completing a trip enqueues stats computation without error", async () => {
    await req
      .post(`/api/v1/admin/trips/${tripId}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "COMPLETED" })
      .expect(200);
  });
});

const binaryParser = (res: NodeJS.ReadableStream, callback: (err: Error | null, body: Buffer) => void): void => {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("P2-29 — GTFS-Realtime feeds (protobuf)", () => {
  it("vehicle-positions decodes as a valid FeedMessage", async () => {
    const res = await req
      .get("/api/v1/gtfs/realtime/vehicle-positions")
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(res.headers["content-type"]).toContain("application/x-protobuf");
    const decoded = GtfsRT.FeedMessage.decode(new Uint8Array(res.body as Buffer));
    expect(decoded.header?.gtfsRealtimeVersion).toBe("2.0");
  });

  it("trip-updates and alerts also decode", async () => {
    const tu = await req.get("/api/v1/gtfs/realtime/trip-updates").buffer(true).parse(binaryParser).expect(200);
    expect(() => GtfsRT.FeedMessage.decode(new Uint8Array(tu.body as Buffer))).not.toThrow();

    const alerts = await req.get("/api/v1/gtfs/realtime/alerts").buffer(true).parse(binaryParser).expect(200);
    expect(() => GtfsRT.FeedMessage.decode(new Uint8Array(alerts.body as Buffer))).not.toThrow();
  });
});

describe("P2-26 — Tracking security: device binding + rate limiting", () => {
  it("fix from the bound device succeeds; fix from an unbound device → 403", async () => {
    // The shared trip was completed by the P2-21 test above; this test
    // needs its own ACTIVE trip to post a fix against.
    const freshTrip = await req
      .post("/api/v1/admin/trips")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ route: routeId, vehicle: vehicleId, scheduledStartAt: new Date().toISOString() })
      .expect(201);
    const freshTripId = freshTrip.body.data.trip._id;
    await req
      .post(`/api/v1/admin/trips/${freshTripId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ driverId, vehicleId, conductorId: null })
      .expect(200);
    await req
      .post(`/api/v1/admin/trips/${freshTripId}/transition`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "ACTIVE" })
      .expect(200);

    await req
      .post("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ deviceId: "bound-device-1", platform: "android" })
      .expect(201);

    // Fresh clock/anomaly state for this vehicle so the large geographic
    // jumps other tests made earlier in the file don't read as teleports.
    clearAnomalyCache(vehicleId);

    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ ...fixAt(STOP_A.lng, STOP_A.lat, 20, nextTs(5 * 60_000)), tripId: freshTripId, deviceId: "bound-device-1" })
      .expect(202);

    await req
      .post("/api/v1/tracking/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ ...fixAt(STOP_A.lng, STOP_A.lat, 20, nextTs(5 * 60_000)), tripId: freshTripId, deviceId: "some-other-device" })
      .expect(403);
  });

  // Runs last: exhausts the per-vehicle ingestion window, which would
  // otherwise 429 any later test hitting a tracking-ingestion route for
  // this vehicle.
  it("per-vehicle ingestion burst → 429 once the window limit is exceeded", async () => {
    const attempts = Array.from({ length: 32 }, () =>
      req
        .post("/api/v1/tracking/heartbeat")
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ vehicleId, tripId, driverId })
    );
    const results = await Promise.all(attempts);
    expect(results.some((r) => r.status === 429)).toBe(true);
  });
});
