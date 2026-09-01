import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
let guestToken = "";

let stopA = "";
let stopB = "";
let stopC = "";
let routeId = "";
let vehicleId = "";
let tripId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;

  const mkStop = async (name: string, code: string, lng: number): Promise<string> => {
    const r = await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, code, location: { type: "Point", coordinates: [lng, 18.5] } })
      .expect(201);
    return r.body.data.stop._id;
  };
  stopA = await mkStop("Sync Stop A", "SYNA", 80.1);
  stopB = await mkStop("Sync Stop B", "SYNB", 80.2);
  stopC = await mkStop("Sync Stop C", "SYNC", 80.3);

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "SYNC-1",
      name: "Sync Route",
      distanceKm: 9,
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
    .send({ registrationNumber: "KA-92-SYNC-2026", model: "Sync", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  const trip = await req
    .post("/api/v1/admin/trips")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      route: routeId,
      vehicle: vehicleId,
      scheduledStartAt: new Date("2026-10-03T08:00:00.000Z").toISOString(),
      scheduledEndAt: new Date("2026-10-03T08:40:00.000Z").toISOString(),
    })
    .expect(201);
  tripId = trip.body.data.trip._id;
});

afterAll(async () => {
  await shutdown();
});

const baseItem = () => ({
  route: routeId,
  boardingStop: stopA,
  destinationStop: stopC,
  paymentMethod: "CASH",
  paid: true,
});

describe("P1-46 — Conductor Offline Sync (bulk tickets + passenger count + reconciliation)", () => {
  it("guest cannot use bulk endpoints → 403", async () => {
    await req
      .post("/api/v1/tickets/bulk")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ items: [{ ...baseItem(), idempotencyKey: "g1" }] })
      .expect(403);
    await req
      .post(`/api/v1/trips/${tripId}/passenger-count/bulk`)
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ items: [{ idempotencyKey: "g2", stop: stopA, boarded: 1 }] })
      .expect(403);
  });

  it("bulk-issues tickets in issuedAt order with per-item statuses", async () => {
    const t = Date.now();
    const res = await req
      .post("/api/v1/tickets/bulk")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        items: [
          { ...baseItem(), idempotencyKey: "b1", issuedAt: new Date(t - 2000).toISOString() },
          { ...baseItem(), idempotencyKey: "b2", issuedAt: new Date(t - 1000).toISOString() },
        ],
      })
      .expect(200);
    expect(res.body.data.summary.created).toBe(2);
    expect(res.body.data.summary.total).toBe(2);
    const results = res.body.data.results;
    expect(results[0].index).toBe(0);
    expect(results[0].ticket.routeNumber).toBe("SYNC-1");
    expect(results[0].ticket.ticketCode).toMatch(/^TKT-/);
    expect(results[1].ticket._id).not.toBe(results[0].ticket._id);
  });

  it("replayed batch (same item keys) → no duplicate tickets, marked replayed", async () => {
    const issuedAt = new Date(Date.now() - 1000).toISOString();
    const first = await req
      .post("/api/v1/tickets/bulk")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ items: [{ ...baseItem(), idempotencyKey: "replay-key", issuedAt }] })
      .expect(200);
    const ticketId = first.body.data.results[0].ticket._id;
    const before = await req.get(`/api/v1/tickets/${ticketId}`).set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(before.body.data.ticket._id).toBe(ticketId);

    const replay = await req
      .post("/api/v1/tickets/bulk")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ items: [{ ...baseItem(), idempotencyKey: "replay-key", issuedAt }] })
      .expect(200);
    expect(replay.body.data.results[0].status).toBe("replayed");
    expect(replay.body.data.results[0].ticket._id).toBe(ticketId);
  });

  it("rejects a future issuedAt timestamp → 400", async () => {
    const res = await req
      .post("/api/v1/tickets/bulk")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        items: [{ ...baseItem(), idempotencyKey: "future", issuedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }],
      })
      .expect(400);
    expect(res.body.error.code).toBe("TIMESTAMP_IN_FUTURE");
  });

  it("passenger-count bulk: applies boarded/alighted in order, per-item onBoard", async () => {
    const t = Date.now();
    const res = await req
      .post(`/api/v1/trips/${tripId}/passenger-count/bulk`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        items: [
          { idempotencyKey: "pc1", stop: stopA, boarded: 10, recordedAt: new Date(t - 3000).toISOString() },
          { idempotencyKey: "pc2", stop: stopB, boarded: 5, alighted: 3, recordedAt: new Date(t - 2000).toISOString() },
          { idempotencyKey: "pc3", stop: stopC, alighted: 8, recordedAt: new Date(t - 1000).toISOString() },
        ],
      })
      .expect(200);
    const results = res.body.data.results;
    // sorted by recordedAt → pc1 first, pc3 last
    expect(results[0].idempotencyKey).toBe("pc1");
    expect(results[2].idempotencyKey).toBe("pc3");
    expect(results[0].applied.onBoard).toBe(10);
    expect(results[1].applied.onBoard).toBe(12); // 10 + 5 - 3
    expect(results[2].applied.onBoard).toBe(4); // 12 - 8
    expect(res.body.data.summary.onBoard).toBe(4);
    expect(res.body.data.summary.boarded).toBe(15);
    expect(res.body.data.summary.alighted).toBe(11);
  });

  it("passenger-count bulk: replayed item key is deduplicated", async () => {
    const issuedAt = new Date(Date.now() - 1000).toISOString();
    const first = await req
      .post(`/api/v1/trips/${tripId}/passenger-count/bulk`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ items: [{ idempotencyKey: "pc-dedup", stop: stopA, boarded: 6, recordedAt: issuedAt }] })
      .expect(200);
    const onBoard = first.body.data.results[0].applied.onBoard;

    const replay = await req
      .post(`/api/v1/trips/${tripId}/passenger-count/bulk`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ items: [{ idempotencyKey: "pc-dedup", stop: stopA, boarded: 6, recordedAt: issuedAt }] })
      .expect(200);
    expect(replay.body.data.results[0].status).toBe("replayed");
    // onBoard unchanged (no double count): the replayed stored result
    expect(replay.body.data.results[0].applied.onBoard).toBe(onBoard);
  });

  it("passenger-count bulk rejects a stop not on the trip route", async () => {
    const outside = await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Off Route", code: "OFF1", location: { type: "Point", coordinates: [81.5, 18.5] } })
      .expect(201);
    const res = await req
      .post(`/api/v1/trips/${tripId}/passenger-count/bulk`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ items: [{ idempotencyKey: "pc-off", stop: outside.body.data.stop._id, boarded: 1 }] })
      .expect(400);
    expect(res.body.error.code).toBe("STOP_NOT_ON_ROUTE");
  });

  it("reconciles a trip — computes expected vs collected variance", async () => {
    const res = await req
      .post(`/api/v1/trips/${tripId}/reconciliation`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ ticketsIssued: 20, cashCollected: 480, digitalCollected: 10 })
      .expect(200);
    const r = res.body.data.reconciliation;
    expect(r.expected).toBe(20);
    expect(r.collected).toBe(490);
    expect(r.variance).toBe(470); // collected - expected
    expect(r.ticketsIssued).toBe(20);
  });

  it("reconciliation is stored on the trip (read back via admin)", async () => {
    await req
      .post(`/api/v1/trips/${tripId}/reconciliation`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ ticketsIssued: 5, cashCollected: 120, digitalCollected: 30 })
      .expect(200);
    const trip = await req.get(`/api/v1/admin/trips/${tripId}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(trip.body.data.trip.reconciliation.variance).toBe(145);
  });
});
