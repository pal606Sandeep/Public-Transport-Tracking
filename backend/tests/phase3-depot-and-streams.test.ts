import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
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
import { SystemSetting } from "../src/models/systemSetting.model.js";
import { invalidateTrackingSettingsCache } from "../src/modules/tracking/settings/tracking-settings.service.js";
import { processDepotGeofence, clearVehicleDepotState } from "../src/modules/tracking/geo/geofence-processing.service.js";
import { broadcastDispatchMessage, broadcastTripForceEnd } from "../src/modules/tracking/geo/broadcast.service.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let httpServer: http.Server;
let baseUrl: string;
let adminToken: string;
let driverToken: string;
let passengerToken: string;
let routeId = "";

async function createStop(name: string, lng: number, lat: number): Promise<string> {
  const r = await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name, location: { type: "Point", coordinates: [lng, lat] } })
    .expect(201);
  return r.body.data.stop._id as string;
}

const connect = (token: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });

const subscribe = (socket: ClientSocket, data: Record<string, unknown>): Promise<{ success: boolean }> =>
  new Promise((resolve) => socket.emit("subscribe", data, resolve));

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
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const stopId = await createStop("Depot-Adjacent Stop", 77.0, 12.0);
  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ routeNumber: `DS-${Date.now()}`, orderedStops: [{ stopId, sequence: 0, scheduledOffsetMinutes: 0 }] })
    .expect(201);
  routeId = route.body.data.route._id;

  // The seeded DRIVER user has no linked Driver profile yet — P1-30's
  // /me/assignments/request needs one to resolve a staff record.
  const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${driverToken}`);
  await req
    .post("/api/v1/admin/drivers")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      user: me.body.data.user._id,
      name: "Stream Test Driver",
      employeeId: "STREAM-EMP-1",
      licenseNumber: "STREAM-LIC-1",
      licenseExpiry: new Date("2030-01-01").toISOString(),
    })
    .expect(201);
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await shutdown();
});

describe("P2-10 — Depot geofencing (System Settings stub for the missing depot data model)", () => {
  const DEPOT = { id: "depot-1", name: "Central Depot", lat: 12.5, lng: 78.5 };

  it("emits no depot events when no depots are configured", async () => {
    await SystemSetting.deleteMany({ key: "depots" });
    invalidateTrackingSettingsCache();
    const results = await processDepotGeofence("veh-no-depot", DEPOT.lat, DEPOT.lng, Date.now());
    expect(results).toEqual([]);
  });

  it("emits depot:arrival on entering the configured radius, then depot:departure on leaving", async () => {
    await SystemSetting.updateOne({ key: "depots" }, { $set: { value: [DEPOT] } }, { upsert: true });
    await SystemSetting.updateOne({ key: "depotRadiusMeters" }, { $set: { value: 100 } }, { upsert: true });
    invalidateTrackingSettingsCache();
    clearVehicleDepotState("veh-depot-1");

    const arrival = await processDepotGeofence("veh-depot-1", DEPOT.lat, DEPOT.lng, Date.now());
    expect(arrival).toHaveLength(1);
    expect(arrival[0].eventType).toBe("depot:arrival");
    expect(arrival[0].depotId).toBe(DEPOT.id);

    // Still inside the radius — no duplicate arrival event.
    const stillIn = await processDepotGeofence("veh-depot-1", DEPOT.lat, DEPOT.lng, Date.now());
    expect(stillIn).toEqual([]);

    // Far away (~1 degree ≈ 100km) — well outside a 100m radius.
    const departure = await processDepotGeofence("veh-depot-1", DEPOT.lat + 1, DEPOT.lng, Date.now());
    expect(departure).toHaveLength(1);
    expect(departure[0].eventType).toBe("depot:departure");
  });

  it("radius change in System Settings takes effect", async () => {
    await SystemSetting.updateOne({ key: "depots" }, { $set: { value: [DEPOT] } }, { upsert: true });
    await SystemSetting.updateOne({ key: "depotRadiusMeters" }, { $set: { value: 20000 } }, { upsert: true }); // 20km
    invalidateTrackingSettingsCache();
    clearVehicleDepotState("veh-depot-2");

    // ~0.1 degree lat ≈ 11km, inside a 20km radius but would have been outside a 100m one.
    const arrival = await processDepotGeofence("veh-depot-2", DEPOT.lat + 0.1, DEPOT.lng, Date.now());
    expect(arrival).toHaveLength(1);
    expect(arrival[0].eventType).toBe("depot:arrival");

    await SystemSetting.updateOne({ key: "depotRadiusMeters" }, { $set: { value: 100 } }, { upsert: true });
    invalidateTrackingSettingsCache();
  });
});

describe("P2-24 — Real-time passenger updates: service alerts share the same rooms as tracking data", () => {
  it("a route-subscribed socket receives both vehicle:location and service:alert (no polling)", async () => {
    const { broadcastToRoute } = await import("../src/config/socket.js");
    const socket = await connect(passengerToken);
    try {
      await subscribe(socket, { routeId });

      const gotLocation = new Promise((resolve) => socket.once("vehicle:location", resolve));
      broadcastToRoute(routeId, "vehicle:location", { vehicleId: "v-stream", latitude: 12.0, longitude: 77.0 });
      await expect(gotLocation).resolves.toMatchObject({ vehicleId: "v-stream" });

      const gotAlert = new Promise((resolve) => socket.once("service:alert", resolve));
      broadcastToRoute(routeId, "service:alert", { title: "Coherent stream test" });
      await expect(gotAlert).resolves.toMatchObject({ title: "Coherent stream test" });
    } finally {
      socket.disconnect();
    }
  });

  it("a guest receives the same stream read-only", async () => {
    const guest = await req.post("/api/v1/auth/guest").expect(200);
    const socket = await connect(guest.body.data.token);
    try {
      const res = await subscribe(socket, { routeId });
      expect(res.success).toBe(true);

      const { broadcastToRoute } = await import("../src/config/socket.js");
      const got = new Promise((resolve) => socket.once("vehicle:delay", resolve));
      broadcastToRoute(routeId, "vehicle:delay", { delayStatus: "DELAYED" });
      await expect(got).resolves.toMatchObject({ delayStatus: "DELAYED" });
    } finally {
      socket.disconnect();
    }
  });
});

describe("P2-25 — Real-time admin updates (fleet:all)", () => {
  it("a manual-assignment request surfaces on fleet:all as assignment:changed", async () => {
    const admin = await connect(adminToken);
    try {
      const sub = await subscribe(admin, { fleetAll: true });
      expect(sub.success).toBe(true);

      const requested = new Promise((resolve) => admin.once("assignment:changed", resolve));
      await req
        .post("/api/v1/me/assignments/request")
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ date: "2026-12-01", reason: "fleet:all relay test" })
        .expect(201);
      await expect(requested).resolves.toMatchObject({ event: "REQUESTED", staffType: "DRIVER" });
    } finally {
      admin.disconnect();
    }
  });

  it("a decided assignment request surfaces on fleet:all too", async () => {
    const admin = await connect(adminToken);
    try {
      await subscribe(admin, { fleetAll: true });
      const list = await req
        .get("/api/v1/admin/assignment-requests?status=PENDING")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const id = list.body.data.requests[0]._id;

      const decided = new Promise((resolve) => admin.once("assignment:changed", resolve));
      await req
        .patch(`/api/v1/admin/assignment-requests/${id}/decision`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ decision: "APPROVE" })
        .expect(200);
      await expect(decided).resolves.toMatchObject({ event: "APPROVED", _id: id });
    } finally {
      admin.disconnect();
    }
  });

  it("non-admin cannot join fleet:all and so never sees assignment:changed", async () => {
    const socket = await connect(passengerToken);
    try {
      const res = await subscribe(socket, { fleetAll: true });
      expect(res.success).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it("dispatch:message and trip:force_end delivery helpers reach fleet:all (P1-54's REST trigger doesn't exist yet — called directly as the documented stub)", async () => {
    const admin = await connect(adminToken);
    try {
      await subscribe(admin, { fleetAll: true });

      const gotDispatch = new Promise((resolve) => admin.once("dispatch:message", resolve));
      broadcastDispatchMessage("Return to depot", { priority: "URGENT" });
      await expect(gotDispatch).resolves.toMatchObject({ message: "Return to depot", priority: "URGENT" });

      const gotForceEnd = new Promise((resolve) => admin.once("trip:force_end", resolve));
      broadcastTripForceEnd("trip-x", "vehicle-x", "Emergency dispatch override");
      await expect(gotForceEnd).resolves.toMatchObject({ tripId: "trip-x", vehicleId: "vehicle-x" });
    } finally {
      admin.disconnect();
    }
  });
});
