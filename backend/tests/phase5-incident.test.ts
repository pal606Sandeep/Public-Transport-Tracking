import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";
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
let guestToken: string;
let staffUserId = "";

let vehicleId = "";

const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-93-INC-2026", model: "IN", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  // a target user for assignment
  const user = await req
    .post("/api/v1/admin/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Dispatach Staff",
      email: `dispatch${Date.now()}@t.co`,
      password: "Password@123",
      role: "DISPATCHER",
    })
    .expect(201);
  staffUserId = user.body.data.user?._id ?? user.body.data._id;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-49 — Incident Management (business workflow)", () => {
  it("guest and passenger cannot access incidents → 403", async () => {
    await req.get("/api/v1/admin/incidents").set("Authorization", `Bearer ${passengerToken}`).expect(403);
    await req.post("/api/v1/admin/incidents").set("Authorization", `Bearer ${guestToken}`).send({ type: "other", title: "x" }).expect(403);
  });

  it("manual incident CRUD: create + list + get", async () => {
    const created = await req
      .post("/api/v1/admin/incidents")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "traffic", title: "Traffic jam near bypass", description: "Heavy congestion" })
      .expect(201);
    const inc = created.body.data.incident;
    expect(inc.status).toBe("OPEN");
    expect(inc.source).toBe("MANUAL");

    const listed = await req
      .get("/api/v1/admin/incidents?type=traffic")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.data.incidents.some((i: Record<string, unknown>) => i._id === inc._id)).toBe(true);

    const got = await req
      .get(`/api/v1/admin/incidents/${inc._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(got.body.data.incident.title).toBe("Traffic jam near bypass");
  });

  it("workflow state machine: OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED, invalid 409", async () => {
    const created = await req
      .post("/api/v1/admin/incidents")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "route issue", title: "Tree fell on route" })
      .expect(201);
    const incId = created.body.data.incident._id;

    // resolving from OPEN is invalid
    await req.post(`/api/v1/admin/incidents/${incId}/resolve`).set("Authorization", `Bearer ${adminToken}`).expect(409);

    const ack = (await req.post(`/api/v1/admin/incidents/${incId}/acknowledge`).set("Authorization", `Bearer ${adminToken}`).expect(200)).body.data.incident;
    expect(ack.status).toBe("ACKNOWLEDGED");
    expect(ack.acknowledgedAt).toBeTruthy();

    const assigned = (await req
      .post(`/api/v1/admin/incidents/${incId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assignedTo: staffUserId })
      .expect(200)).body.data.incident;
    expect(assigned.status).toBe("IN_PROGRESS");
    expect(assigned.assignedAt).toBeTruthy();

    const resolved = (await req
      .post(`/api/v1/admin/incidents/${incId}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ note: "Cleared debris" })
      .expect(200)).body.data.incident;
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeTruthy();

    const closed = (await req.post(`/api/v1/admin/incidents/${incId}/close`).set("Authorization", `Bearer ${adminToken}`).expect(200)).body.data.incident;
    expect(closed.status).toBe("CLOSED");

    // closing an already-closed incident is invalid
    await req.post(`/api/v1/admin/incidents/${incId}/close`).set("Authorization", `Bearer ${adminToken}`).expect(409);
  });

  it("converts a DRIVER_SOS signal into an OPEN accident incident + vehicle status change in one transaction", async () => {
    const { handleIncidentSignal } = await import("../src/modules/incident/incident.consumer.js");
    const event = {
      eventType: "DRIVER_SOS",
      payload: {
        vehicleId,
        tripId: new Types.ObjectId().toString(),
        routeId: new Types.ObjectId().toString(),
        driverId: new Types.ObjectId().toString(),
        location: { lat: 18.52, lng: 73.85 },
        timestamp: Date.now(),
      },
      traceId: "trk_sos_1",
      timestamp: Date.now(),
    };

    const r1 = await handleIncidentSignal(event);
    expect(r1.stored).toBe("new");
    const inc = r1.incident as Record<string, unknown>;
    expect(inc.type).toBe("accident");
    expect(inc.source).toBe("DRIVER_SOS");
    expect(inc.severity).toBe("CRITICAL");
    expect(inc.status).toBe("OPEN");

    const byId = (await req.get(`/api/v1/admin/incidents/${inc._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200)).body.data.incident;
    expect(byId.location).toMatchObject({ type: "Point", coordinates: [73.85, 18.52] });

    // vehicle status changed to INACTIVE within the same transaction
    const veh = (await req.get(`/api/v1/admin/vehicles/${vehicleId}`).set("Authorization", `Bearer ${adminToken}`).expect(200)).body.data.vehicle;
    expect(veh.status).toBe("INACTIVE");

    // re-delivery with the same traceId is deduped
    const r2 = await handleIncidentSignal(event);
    expect(r2.stored).toBe("duplicate");
  });

  it("converts VEHICLE_OFFLINE into a breakdown incident", async () => {
    const { handleIncidentSignal } = await import("../src/modules/incident/incident.consumer.js");
    const r = await handleIncidentSignal({
      eventType: "VEHICLE_OFFLINE",
      payload: {
        vehicleId,
        tripId: new Types.ObjectId().toString(),
        routeId: new Types.ObjectId().toString(),
        driverId: new Types.ObjectId().toString(),
        lastSeenTimestamp: Date.now(),
        offlineSince: Date.now(),
        reason: "no_gps_heartbeat",
        lastKnownLocation: { lat: 18.6, lng: 73.9 },
        timestamp: Date.now(),
      },
      traceId: "trk_offline_1",
      timestamp: Date.now(),
    });
    expect(r.stored).toBe("new");
    const inc = r.incident as Record<string, unknown>;
    expect(inc.type).toBe("breakdown");
    expect(inc.title).toBe("Vehicle offline");
  });

  it("ignores non-incident signals (BUS_ARRIVED_STOP)", async () => {
    const { handleIncidentSignal } = await import("../src/modules/incident/incident.consumer.js");
    const r = await handleIncidentSignal({
      eventType: "BUS_ARRIVED_STOP",
      payload: { vehicleId, timestamp: Date.now() },
      traceId: "trk_arrived_1",
      timestamp: Date.now(),
    });
    expect(r.stored).toBe("duplicate"); // not an incident signal → skipped
  });
});
