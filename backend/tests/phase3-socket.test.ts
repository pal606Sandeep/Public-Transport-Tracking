import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let httpServer: http.Server;
let baseUrl: string;
let adminToken: string;
let passengerToken: string;
let guestToken: string;

const connect = (token: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { auth: { token }, transports: ["websocket"], forceNew: true });
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
  const guest = await req.post("/api/v1/auth/guest").expect(200);
  guestToken = guest.body.data.token;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await shutdown();
});

describe("P2-02 — Socket.IO auth + rooms", () => {
  it("rejects a connection with no token", async () => {
    await expect(connect("")).rejects.toBeTruthy();
  });

  it("rejects a connection with a bad token", async () => {
    await expect(connect("not-a-real-token")).rejects.toBeTruthy();
  });

  it("accepts a valid access token and joins vehicle/route/trip/stop rooms", async () => {
    const socket = await connect(adminToken);
    try {
      const res = await subscribe(socket, { vehicleId: "v1", routeId: "r1", tripId: "t1", stopId: "s1" });
      expect(res.success).toBe(true);
      expect(res.message).toContain("vehicle:v1");
      expect(res.message).toContain("route:r1");
      expect(res.message).toContain("trip:t1");
      expect(res.message).toContain("stop:s1");
    } finally {
      socket.disconnect();
    }
  });

  it("lets a guest token join vehicle/route/trip/stop rooms read-only", async () => {
    const socket = await connect(guestToken);
    try {
      const res = await subscribe(socket, { routeId: "r2", stopId: "s2" });
      expect(res.success).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it("rejects a guest from fleet:all", async () => {
    const socket = await connect(guestToken);
    try {
      const res = await subscribe(socket, { fleetAll: true });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/admin/i);
    } finally {
      socket.disconnect();
    }
  });

  it("rejects a non-admin passenger from fleet:all", async () => {
    const socket = await connect(passengerToken);
    try {
      const res = await subscribe(socket, { fleetAll: true });
      expect(res.success).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it("lets an admin join fleet:all", async () => {
    const socket = await connect(adminToken);
    try {
      const res = await subscribe(socket, { fleetAll: true });
      expect(res.success).toBe(true);
      expect(res.message).toContain("fleet:all");
    } finally {
      socket.disconnect();
    }
  });

  it("delivers a broadcast to sockets in a route room but not outsiders", async () => {
    const { broadcastToRoute } = await import("../src/config/socket.js");
    const inRoom = await connect(adminToken);
    const outsider = await connect(passengerToken);
    try {
      await subscribe(inRoom, { routeId: "broadcast-route" });
      await subscribe(outsider, { routeId: "some-other-route" });

      const received = new Promise((resolve) => inRoom.once("service:alert", resolve));
      const notReceived = new Promise((resolve) => {
        outsider.once("service:alert", () => resolve(true));
        setTimeout(() => resolve(false), 300);
      });

      broadcastToRoute("broadcast-route", "service:alert", { title: "Test alert" });

      await expect(received).resolves.toMatchObject({ title: "Test alert" });
      await expect(notReceived).resolves.toBe(false);
    } finally {
      inRoom.disconnect();
      outsider.disconnect();
    }
  });

  it("delivers a broadcast to sockets in a stop room", async () => {
    const { broadcastToStop } = await import("../src/config/socket.js");
    const socket = await connect(adminToken);
    try {
      await subscribe(socket, { stopId: "broadcast-stop" });
      const received = new Promise((resolve) => socket.once("service:alert", resolve));
      broadcastToStop("broadcast-stop", "service:alert", { title: "Stop alert" });
      await expect(received).resolves.toMatchObject({ title: "Stop alert" });
    } finally {
      socket.disconnect();
    }
  });
});
