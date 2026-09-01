import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { boot, loginToken, shutdown, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let httpServer: http.Server;
let baseUrl: string;
let adminToken: string;
let passengerToken: string;
const pendingSockets: ClientSocket[] = [];

const connect = (token: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
    pendingSockets.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });

const subscribe = (socket: ClientSocket, data: Record<string, unknown>): Promise<{ success: boolean; message?: string; error?: string }> =>
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
});

afterAll(async () => {
  // Disconnect any lingering socket clients first.
  for (const s of pendingSockets) s.disconnect();
  await shutdown();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe("P1-54 — Admin dispatch messaging", () => {
  it("guest + passenger cannot reach dispatch endpoints → 403", async () => {
    await req
      .post("/api/v1/admin/dispatch/messages")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ message: "hi" })
      .expect(403);
    await req
      .get("/api/v1/admin/dispatch/messages")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(403);
  });

  it("validation: empty message → 400", async () => {
    await req
      .post("/api/v1/admin/dispatch/messages")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "" })
      .expect(400);
  });

  it("POST /messages persists + broadcasts to fleet:all", async () => {
    const socket = await connect(adminToken);
    try {
      const sub = await subscribe(socket, { fleetAll: true });
      expect(sub.success).toBe(true);

      const received: unknown[] = [];
      socket.on("dispatch:message", (data: unknown) => received.push(data));
      await new Promise((r) => setTimeout(r, 100));

      await req
        .post("/api/v1/admin/dispatch/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ message: "Heads up dispatchers", priority: "URGENT" })
        .expect(201);

      await new Promise((r) => setTimeout(r, 300));
      expect(received.length).toBeGreaterThanOrEqual(1);
      const p = received[0] as { message: string; priority: string };
      expect(p.message).toBe("Heads up dispatchers");
      expect(p.priority).toBe("URGENT");

      const list = (await req
        .get("/api/v1/admin/dispatch/messages")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)).body.data;
      expect(list.messages.length).toBeGreaterThanOrEqual(1);
      expect(list.messages[0].message).toBe("Heads up dispatchers");
      expect(list.messages[0].priority).toBe("URGENT");
    } finally {
      socket.disconnect();
    }
  });

  it("POST /trips/:id/force-end-broadcast 404 when trip missing", async () => {
    await req
      .post("/api/v1/admin/dispatch/trips/000000000000000000000000/force-end-broadcast")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "abuse" })
      .expect(404);
  });

  it("trip force-end broadcast path persists + returns trip metadata", async () => {
    const { Trip } = await import("../src/modules/trip/trip.model.js");
    const tripDoc = await Trip.create({
      route: new (await import("mongoose")).Types.ObjectId(),
      status: "ACTIVE",
      scheduledStartAt: new Date(),
      scheduledEndAt: new Date(Date.now() + 600000),
    });
    const r = (await req
      .post(`/api/v1/admin/dispatch/trips/${tripDoc._id.toString()}/force-end-broadcast`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "emergency dispatch" })
      .expect(200)).body.data;
    expect(r.tripId).toBe(tripDoc._id.toString());
    expect(r.reason).toBe("emergency dispatch");

    const audit = (await req
      .get(`/api/v1/admin/audit-logs?resource=trip&action=dispatch.trip_force_end`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(audit.logs.length).toBeGreaterThanOrEqual(1);
    expect(audit.logs[0].resourceId).toBe(tripDoc._id.toString());
  });
});