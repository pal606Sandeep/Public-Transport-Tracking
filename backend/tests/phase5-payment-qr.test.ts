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

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;

let httpServer: http.Server;
let baseUrl: string;

let stopA = "";
let stopC = "";
let routeId = "";
let vehicleId = "";
let tripId = "";

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
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const { default: app } = await import("../src/app.js");
  const { initSocket } = await import("../src/config/socket.js");
  httpServer = http.createServer(app);
  initSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;

  const mkStop = async (name: string, code: string, lng: number): Promise<string> => {
    const r = await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, code, location: { type: "Point", coordinates: [lng, 18.5] } })
      .expect(201);
    return r.body.data.stop._id;
  };
  stopA = await mkStop("QR Stop A", "QRA", 79.1);
  const stopB = await mkStop("QR Stop B", "QRB", 79.2);
  stopC = await mkStop("QR Stop C", "QRC", 79.3);

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "QR-1",
      name: "Payment QR Route",
      distanceKm: 10,
      estimatedDurationMin: 30,
      orderedStops: [
        { stopId: stopA, sequence: 0 },
        { stopId: stopB, sequence: 1 },
        { stopId: stopC, sequence: 2 },
      ],
    })
    .expect(201);
  routeId = route.body.data.route._id;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-91-QR-2026", model: "Ashok", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  const trip = await req
    .post("/api/v1/admin/trips")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      route: routeId,
      vehicle: vehicleId,
      scheduledStartAt: new Date("2026-10-02T08:00:00.000Z").toISOString(),
      scheduledEndAt: new Date("2026-10-02T08:45:00.000Z").toISOString(),
    })
    .expect(201);
  tripId = trip.body.data.trip._id;

  void stopB;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await shutdown();
});

describe("P1-45 — Payment QR (dynamic UPI + payment:confirmed)", () => {
  it("guest cannot generate a QR → 403", async () => {
    const guest = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;
    await req
      .post("/api/v1/payments/qr")
      .set("Authorization", `Bearer ${guest}`)
      .send({ tripId, amount: 50, purpose: "onboard" })
      .expect(403);
  });

  it("generates a well-formed dynamic UPI/QR payload for a trip", async () => {
    const res = await req
      .post("/api/v1/payments/qr")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ tripId, amount: 50, purpose: "onboard fare" })
      .expect(201);
    const d = res.body.data;
    expect(d.payment.status).toBe("PENDING");
    expect(d.payment.trip).toBe(tripId);
    expect(d.amount).toBe(50);
    expect(d.paymentReference).toMatch(/^QR-/);
    expect(d.upiString).toMatch(/^upi:\/\/pay\?/);
    expect(d.upiString).toContain("pa=");
    expect(d.upiString).toContain("am=50");
    expect(d.upiString).toContain("cu=INR");
    expect(d.upiString).toContain("tr=" + d.paymentReference);
    expect(d.qrPayload).toBeTruthy();
    expect(d.expiresInSeconds).toBe(300);
  });

  it("returns QR for unknown tripId → 404", async () => {
    await req
      .post("/api/v1/payments/qr")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ tripId: "0123456789abcdef01234567", amount: 50 })
      .expect(404);
  });

  it("webhook SUCCESS emits payment:confirmed to the trip:{id} room", async () => {
    const res = await req
      .post("/api/v1/payments/qr")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ tripId, amount: 40, purpose: "onboard fare" })
      .expect(201);
    const ref = res.body.data.paymentReference;

    const socket = await connect(passengerToken);
    try {
      await subscribe(socket, { tripId });
      const received = new Promise((resolve) => socket.once("payment:confirmed", resolve));

      const webhook = await req
        .post("/api/v1/payments/webhook/upi")
        .send({ providerRef: ref, status: "SUCCESS", amount: 40 })
        .expect(200);
      expect(webhook.body.data.payment.status).toBe("SUCCESS");
      expect(webhook.body.data.replayed).toBe(false);

      await expect(received).resolves.toMatchObject({ paymentId: webhook.body.data.payment._id, amount: 40 });
    } finally {
      socket.disconnect();
    }
  });

  it("rejects a webhook whose amount does not match the QR payment", async () => {
    const res = await req
      .post("/api/v1/payments/qr")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ tripId, amount: 30, purpose: "onboard" })
      .expect(201);
    const ref = res.body.data.paymentReference;

    await req
      .post("/api/v1/payments/webhook/upi")
      .send({ providerRef: ref, status: "SUCCESS", amount: 31 })
      .expect(409);
  });

  it("trip payments appear in the conductor/passenger payment history", async () => {
    const res = await req
      .post("/api/v1/payments/qr")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ tripId, amount: 25, purpose: "onboard" })
      .expect(201);
    const payId = res.body.data.payment._id;
    const list = await req.get("/api/v1/payments").set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(list.body.data.payments.some((p: { _id: string }) => p._id === payId)).toBe(true);
  });
});
