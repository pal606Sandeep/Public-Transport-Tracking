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
  USER_EMAIL,
  USER_PASSWORD,
} from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let httpServer: http.Server;
let baseUrl: string;
let adminToken: string;
let passengerToken: string;

let routeAId = "";
let stopAId = "";
let stopBId = "";

async function createStop(name: string, lng: number, lat: number): Promise<string> {
  const r = await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name, location: { type: "Point", coordinates: [lng, lat] } })
    .expect(201);
  return r.body.data.stop._id as string;
}

async function createRoute(stopId: string): Promise<string> {
  const r = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: `SA-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      orderedStops: [{ stopId, sequence: 0, scheduledOffsetMinutes: 0 }],
    })
    .expect(201);
  return r.body.data.route._id as string;
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
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  stopAId = await createStop("Alert Stop A", 77.0, 12.0);
  stopBId = await createStop("Alert Stop B", 77.5, 12.5);
  routeAId = await createRoute(stopAId);
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await shutdown();
});

describe("P1-38 — Service Alerts & Announcements", () => {
  it("passenger cannot reach admin endpoints → 403", async () => {
    await req.get("/api/v1/admin/service-alerts").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("creates a DRAFT alert targeting specific routes", async () => {
    const res = await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Route closure",
        message: "Route closed for maintenance",
        type: "closure",
        severity: "HIGH",
        targeting: { type: "routes", routeIds: [routeAId] },
        startsAt: new Date(Date.now() - 1000).toISOString(),
        endsAt: new Date(Date.now() + 3600_000).toISOString(),
      })
      .expect(201);
    expect(res.body.data.serviceAlert.status).toBe("DRAFT");
    expect(res.body.data.serviceAlert.resolvedRouteIds).toEqual([routeAId]);
  });

  it("rejects targeting a route that doesn't exist", async () => {
    await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Bad route",
        message: "x",
        type: "general",
        targeting: { type: "routes", routeIds: ["64b000000000000000000000"] },
        startsAt: new Date().toISOString(),
      })
      .expect(400);
  });

  it("does not appear on public read while still DRAFT", async () => {
    const res = await req.get(`/api/v1/service-alerts?routeId=${routeAId}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.serviceAlerts.find((a: { title: string }) => a.title === "Route closure")).toBeUndefined();
  });

  it("publish resolves targeting, sets status, and emits service:alert to the route room", async () => {
    const create = await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Live alert",
        message: "Broadcast now",
        type: "disruption",
        targeting: { type: "routes", routeIds: [routeAId] },
        startsAt: new Date(Date.now() - 1000).toISOString(),
      })
      .expect(201);
    const id = create.body.data.serviceAlert._id;

    const socket = await connect(adminToken);
    try {
      await subscribe(socket, { routeId: routeAId });
      const received = new Promise((resolve) => socket.once("service:alert", resolve));

      const publish = await req
        .post(`/api/v1/admin/service-alerts/${id}/publish`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(publish.body.data.serviceAlert.status).toBe("PUBLISHED");

      await expect(received).resolves.toMatchObject({ _id: id, title: "Live alert" });
    } finally {
      socket.disconnect();
    }

    const publicRes = await req.get(`/api/v1/service-alerts?routeId=${routeAId}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(publicRes.body.data.serviceAlerts.some((a: { _id: string }) => a._id === id)).toBe(true);

    const otherRouteRes = await req.get(`/api/v1/service-alerts?routeId=64b000000000000000000abc`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(otherRouteRes.body.data.serviceAlerts.some((a: { _id: string }) => a._id === id)).toBe(false);
  });

  it("geoArea targeting resolves to stops/routes inside the polygon", async () => {
    const res = await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Weather alert",
        message: "Heavy rain in the area",
        type: "weather",
        targeting: {
          type: "geoArea",
          geoArea: {
            type: "Polygon",
            coordinates: [
              [
                [76.9, 11.9],
                [77.1, 11.9],
                [77.1, 12.1],
                [76.9, 12.1],
                [76.9, 11.9],
              ],
            ],
          },
        },
        startsAt: new Date().toISOString(),
        status: "PUBLISHED",
      })
      .expect(201);
    expect(res.body.data.serviceAlert.resolvedStopIds).toContain(stopAId);
    expect(res.body.data.serviceAlert.resolvedStopIds).not.toContain(stopBId);
    expect(res.body.data.serviceAlert.resolvedRouteIds).toContain(routeAId);
  });

  it("all-targeting alert appears for any routeId/stopId query", async () => {
    await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "System-wide notice",
        message: "Fare change effective today",
        type: "general",
        targeting: { type: "all" },
        startsAt: new Date(Date.now() - 1000).toISOString(),
        status: "PUBLISHED",
      })
      .expect(201);

    const res = await req.get(`/api/v1/service-alerts?stopId=${stopBId}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.serviceAlerts.some((a: { title: string }) => a.title === "System-wide notice")).toBe(true);
  });

  it("excludes an expired alert from public read", async () => {
    await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Expired notice",
        message: "This already ended",
        type: "general",
        targeting: { type: "all" },
        startsAt: new Date(Date.now() - 7200_000).toISOString(),
        endsAt: new Date(Date.now() - 3600_000).toISOString(),
        status: "PUBLISHED",
      })
      .expect(201);

    const res = await req.get("/api/v1/service-alerts").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.serviceAlerts.some((a: { title: string }) => a.title === "Expired notice")).toBe(false);
  });

  it("cannot publish an already-published alert", async () => {
    const create = await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Double publish",
        message: "x",
        type: "general",
        targeting: { type: "all" },
        startsAt: new Date().toISOString(),
        status: "PUBLISHED",
      })
      .expect(201);
    await req
      .post(`/api/v1/admin/service-alerts/${create.body.data.serviceAlert._id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(409);
  });

  it("cancel removes a published alert from public read", async () => {
    const create = await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Cancel me",
        message: "x",
        type: "general",
        targeting: { type: "all" },
        startsAt: new Date().toISOString(),
        status: "PUBLISHED",
      })
      .expect(201);
    const id = create.body.data.serviceAlert._id;

    await req.post(`/api/v1/admin/service-alerts/${id}/cancel`).set("Authorization", `Bearer ${adminToken}`).expect(200);

    const res = await req.get("/api/v1/service-alerts").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.serviceAlerts.some((a: { _id: string }) => a._id === id)).toBe(false);
  });

  it("soft-deletes an alert", async () => {
    const create = await req
      .post("/api/v1/admin/service-alerts")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Delete me",
        message: "x",
        type: "general",
        targeting: { type: "all" },
        startsAt: new Date().toISOString(),
      })
      .expect(201);
    const id = create.body.data.serviceAlert._id;

    await req.delete(`/api/v1/admin/service-alerts/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    await req.get(`/api/v1/admin/service-alerts/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(404);
  });
});
