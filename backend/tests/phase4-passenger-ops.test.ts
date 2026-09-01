import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  boot,
  shutdown,
  loginToken,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
  DRIVER_EMAIL,
  DRIVER_PASSWORD,
} from "./support.js";
import redisClient from "../src/config/redis.js";
import { Schedule } from "../src/modules/schedule/schedule.model.js";
import { Trip } from "../src/modules/trip/trip.model.js";
import { Notification } from "../src/modules/notification/notification.model.js";
import { NotificationPreference } from "../src/modules/notification/notificationPreference.model.js";
import { setChannelSender, resetChannelSenders } from "../src/modules/notification/channels.js";
import { handleTrackingEvent } from "../src/modules/notification/event-consumer.js";
import { dispatchNotification } from "../src/modules/notification/notification.service.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;
let driverToken: string;
let guestToken: string;
let passengerUserId = "";

// stop ids in route order
let sA = "";
let sB = "";
let sC = "";
let sD = "";
let routeMain = ""; // A -> B -> C
let routeCross = ""; // C -> D  (transfer at C)
let vehicleId = "";

const mkStop = async (name: string, lng: number, lat: number): Promise<string> => {
  const res = await req
    .post("/api/v1/admin/stops")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name, code: name.replace(/\s/g, "").toUpperCase(), location: { type: "Point", coordinates: [lng, lat] } })
    .expect(201);
  return res.body.data.stop._id;
};

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  driverToken = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;

  passengerUserId = (
    await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${passengerToken}`).expect(200)
  ).body.data.user._id;

  sA = await mkStop("Alpha Cross", 77.5900, 12.9700);
  sB = await mkStop("Beta Junction", 77.6000, 12.9750);
  sC = await mkStop("Gamma Terminal", 77.6100, 12.9800);
  sD = await mkStop("Delta Depot", 77.6200, 12.9850);

  const mainRes = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "M-1",
      name: "Main Line",
      geometry: { type: "LineString", coordinates: [[77.59, 12.97], [77.6, 12.975], [77.61, 12.98]] },
      orderedStops: [
        { stopId: sA, sequence: 0, scheduledOffsetMinutes: 0 },
        { stopId: sB, sequence: 1, scheduledOffsetMinutes: 10 },
        { stopId: sC, sequence: 2, scheduledOffsetMinutes: 20 },
      ],
    })
    .expect(201);
  routeMain = mainRes.body.data.route._id;

  const crossRes = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "X-9",
      name: "Cross Line",
      orderedStops: [
        { stopId: sC, sequence: 0, scheduledOffsetMinutes: 0 },
        { stopId: sD, sequence: 1, scheduledOffsetMinutes: 8 },
      ],
    })
    .expect(201);
  routeCross = crossRes.body.data.route._id;

  const veh = await req
    .post("/api/v1/admin/vehicles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ registrationNumber: "KA-04-P4-2026", model: "Bus", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;

  await Schedule.create({
    name: "M-1 weekday",
    route: routeMain,
    frequencyType: "DAILY",
    departureTimes: ["06:00", "09:00", "18:00"],
    durationMin: 25,
    isActive: true,
  });
});

afterAll(async () => {
  resetChannelSenders();
  await shutdown();
});

/* ============================================================ P1-33 */

describe("P1-33 — Route/Stop search + find bus", () => {
  it("partial-name route search", async () => {
    const res = await req.get("/api/v1/discovery/routes?q=main").set("Authorization", `Bearer ${guestToken}`).expect(200);
    expect(res.body.data.routes.map((r: { routeNumber: string }) => r.routeNumber)).toContain("M-1");
  });

  it("nearest-stop search by lat/lng", async () => {
    const res = await req
      .get("/api/v1/discovery/stops?lat=12.9701&lng=77.5901&radius=500")
      .set("Authorization", `Bearer ${guestToken}`)
      .expect(200);
    expect(res.body.data.stops[0]._id).toBe(sA);
    expect(res.body.data.stops[0].distanceMeters).toBeLessThan(500);
  });

  it("text stop search", async () => {
    const res = await req.get("/api/v1/discovery/stops?q=junction").set("Authorization", `Bearer ${guestToken}`).expect(200);
    expect(res.body.data.stops.map((s: { _id: string }) => s._id)).toContain(sB);
  });

  it("find-bus source→destination returns routes serving both stops in order", async () => {
    const res = await req
      .get(`/api/v1/discovery/find-bus?from=${sA}&to=${sC}`)
      .set("Authorization", `Bearer ${guestToken}`)
      .expect(200);
    const nums = res.body.data.routes.map((r: { routeNumber: string }) => r.routeNumber);
    expect(nums).toContain("M-1");
    expect(nums).not.toContain("X-9");
    const m1 = res.body.data.routes.find((r: { routeNumber: string }) => r.routeNumber === "M-1");
    expect(m1.intermediateStops).toBe(1);
    expect(m1.scheduledDurationMinutes).toBe(20);
  });

  it("find-bus rejects reversed stop order", async () => {
    const res = await req
      .get(`/api/v1/discovery/find-bus?from=${sC}&to=${sA}`)
      .set("Authorization", `Bearer ${guestToken}`)
      .expect(200);
    expect(res.body.data.routes).toHaveLength(0);
  });
});

/* ============================================================ P1-34 */

describe("P1-34 — Journey Planner", () => {
  it("direct route ranked above a 1-transfer option; fares sum correctly", async () => {
    const res = await req
      .get(`/api/v1/journeys?from=${sA}&to=${sD}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);

    const opts = res.body.data.options;
    expect(opts.length).toBeGreaterThanOrEqual(1);
    // First option should be the lowest transfer count available.
    expect(opts[0].transfers).toBeLessThanOrEqual(opts[opts.length - 1].transfers);

    // A->D needs a transfer at C (M-1 then X-9).
    const oneTransfer = opts.find((o: { transfers: number }) => o.transfers === 1);
    expect(oneTransfer).toBeTruthy();
    expect(oneTransfer.transferPoints[0].stopId).toBe(sC);
    const legFareSum = oneTransfer.legs.reduce((s: number, l: { fare: number }) => s + l.fare, 0);
    expect(oneTransfer.totalFare).toBe(legFareSum);
    // base 10 + perStop 2: A->C spans 2 stops (14), C->D spans 1 stop (12) => 26
    expect(oneTransfer.totalFare).toBe(26);
  });

  it("direct A→C option has 0 transfers and a scheduled next departure", async () => {
    const res = await req
      .get(`/api/v1/journeys?from=${sA}&to=${sC}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    const direct = res.body.data.options.find((o: { transfers: number }) => o.transfers === 0);
    expect(direct).toBeTruthy();
    expect(direct.legs[0].nextDeparture).toBeTruthy();
    expect(direct.legs[0].liveEtaSeconds).toBeNull();
  });

  it("live ETA populated when a trip is active, static offset otherwise", async () => {
    const trip = await Trip.create({
      route: routeMain,
      vehicle: vehicleId,
      status: "ACTIVE",
      startTime: new Date(),
    });
    await redisClient.set(
      `vehicle:${vehicleId}:eta`,
      JSON.stringify({ stops: { [sA]: { etaSeconds: 240 } }, etaSeconds: 300 })
    );

    const res = await req
      .get(`/api/v1/journeys?from=${sA}&to=${sC}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    const direct = res.body.data.options.find((o: { transfers: number }) => o.transfers === 0);
    expect(direct.legs[0].liveEtaSeconds).toBe(240);

    await redisClient.del(`vehicle:${vehicleId}:eta`);
    await Trip.deleteOne({ _id: trip._id });
  });

  it("coordinate origin reports walking distance to the first stop", async () => {
    const res = await req
      .get(`/api/v1/journeys?from=12.9705,77.5905&to=${sC}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(res.body.data.walkingDistanceToFirstStopMeters).toBeGreaterThan(0);
  });
});

/* ============================================================ P1-35 */

describe("P1-35 — Favourite Subscriptions", () => {
  it("guest → 403", async () => {
    await req
      .post("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ type: "route", targetId: routeMain })
      .expect(403);
  });

  it("create / list / dedupe / delete", async () => {
    const c1 = await req
      .post("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: routeMain })
      .expect(201);

    const dup = await req
      .post("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: routeMain })
      .expect(200);
    expect(dup.body.data.subscription._id).toBe(c1.body.data.subscription._id);

    await req
      .post("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "stop", targetId: sB })
      .expect(201);

    const list = await req
      .get("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(list.body.data.subscriptions).toHaveLength(2);

    await req
      .delete(`/api/v1/passengers/me/subscriptions/${c1.body.data.subscription._id}`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);

    const after = await req
      .get("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(after.body.data.subscriptions).toHaveLength(1);
  });

  it("unknown target → 404", async () => {
    await req
      .post("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: "0123456789abcdef01234567" })
      .expect(404);
  });
});

/* ============================================================ P1-36 */

describe("P1-36 — Notification Service (core)", () => {
  it("template renders with variables", async () => {
    await req
      .post("/api/v1/admin/notification-templates")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        key: "bus_delayed",
        titleTemplate: "Route {{routeId}} delayed",
        bodyTemplate: "About {{mins}} minutes late",
        variables: ["routeId", "mins"],
      })
      .expect(200);

    const res = await req
      .post("/api/v1/admin/notification-templates/preview")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ key: "bus_delayed", vars: { routeId: "M-1", mins: 7 } })
      .expect(200);
    expect(res.body.data.title).toBe("Route M-1 delayed");
    expect(res.body.data.body).toBe("About 7 minutes late");
  });

  it("in-app notification stored + read toggle", async () => {
    await dispatchNotification({
      userId: passengerUserId,
      type: "TEST",
      title: "Hello",
      body: "World",
      channels: ["inApp"],
    });

    const list = await req
      .get("/api/v1/notifications?unreadOnly=true")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(list.body.data.unread).toBeGreaterThanOrEqual(1);
    const nid = list.body.data.notifications[0]._id;

    const read = await req
      .patch(`/api/v1/notifications/${nid}/read`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ read: true })
      .expect(200);
    expect(read.body.data.notification.read).toBe(true);

    await req
      .patch(`/api/v1/notifications/${nid}/read`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ read: false })
      .expect(200);
  });

  it("quiet hours defer external delivery but still store in-app", async () => {
    // Quiet window covering "now" (UTC).
    const now = new Date();
    const start = `${String(now.getUTCHours()).padStart(2, "0")}:00`;
    const endH = (now.getUTCHours() + 2) % 24;
    const end = `${String(endH).padStart(2, "0")}:00`;
    await req
      .put("/api/v1/notifications/preferences")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ quietHours: { start, end } })
      .expect(200);

    const r = await dispatchNotification({
      userId: passengerUserId,
      type: "QUIET_TEST",
      title: "shh",
      body: "later",
      channels: ["inApp", "webpush"],
    });
    expect(r.status).toBe("deferred");
    expect(r.deferredUntil).toBeTruthy();

    const stored = await Notification.findById(r.notificationId).lean();
    expect(stored?.status).toBe("deferred");

    // urgent bypasses quiet hours
    const urgent = await dispatchNotification({
      userId: passengerUserId,
      type: "QUIET_TEST",
      title: "SOS",
      body: "now",
      channels: ["inApp"],
      urgent: true,
    });
    expect(urgent.status).toBe("sent");

    await NotificationPreference.updateOne(
      { user: passengerUserId },
      { $set: { "quietHours.start": null, "quietHours.end": null } }
    );
  });

  it("expired push subscription pruned on 410", async () => {
    await req
      .post("/api/v1/notifications/push-subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        endpoint: "https://push.example.com/sub/expired-1",
        keys: { p256dh: "BExamplePublicKey", auth: "authsecret" },
      })
      .expect(201);

    setChannelSender("webpush", async () => {
      const err = new Error("gone") as Error & { statusCode: number };
      err.statusCode = 410;
      throw err;
    });

    const r = await dispatchNotification({
      userId: passengerUserId,
      type: "PUSH_TEST",
      title: "t",
      body: "b",
      channels: ["inApp", "webpush"],
    });
    expect(r.pushPruned).toBe(1);
    resetChannelSenders();

    const list = await req
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(list.body.data).toBeTruthy();
  });
});

/* ============================================================ P1-37 */

describe("P1-37 — Notification: consume Person 2 events + fan-out", () => {
  it("BUS_DELAYED notifies route subscribers only", async () => {
    await req
      .post("/api/v1/passengers/me/subscriptions")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ type: "route", targetId: routeMain })
      .expect(201);

    const before = await Notification.countDocuments({ user: passengerUserId, type: "BUS_DELAYED" });

    const res = await handleTrackingEvent({
      eventType: "VEHICLE_DELAYED",
      payload: { routeId: routeMain, vehicleId, delaySeconds: 420 },
      traceId: "trace-delayed-1",
      timestamp: Date.now(),
    });
    expect(res.notified).toBe(1);

    // repeated event with same traceId → dedupe (no new notification)
    const dupe = await handleTrackingEvent({
      eventType: "VEHICLE_DELAYED",
      payload: { routeId: routeMain, vehicleId, delaySeconds: 420 },
      traceId: "trace-delayed-1",
      timestamp: Date.now(),
    });
    expect(dupe.notified).toBe(0);

    const after = await Notification.countDocuments({ user: passengerUserId, type: "BUS_DELAYED" });
    expect(after - before).toBe(1);

    // a route nobody subscribes to → nobody notified
    const none = await handleTrackingEvent({
      eventType: "VEHICLE_DELAYED",
      payload: { routeId: routeCross, vehicleId, delaySeconds: 60 },
      traceId: "trace-delayed-2",
      timestamp: Date.now(),
    });
    expect(none.notified).toBe(0);
  });

  it("DRIVER_SOS routes to operations staff", async () => {
    const res = await handleTrackingEvent({
      eventType: "DRIVER_SOS",
      payload: { vehicleId, routeId: routeMain, driverId: "d1" },
      traceId: "trace-sos-1",
      timestamp: Date.now(),
    });
    // admin (SUPER_ADMIN) is the only ops user seeded
    expect(res.notified).toBeGreaterThanOrEqual(1);

    const adminUserId = (
      await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${adminToken}`).expect(200)
    ).body.data.user._id;
    const sos = await Notification.findOne({ user: adminUserId, type: "DRIVER_SOS" }).lean();
    expect(sos).toBeTruthy();
  });
});

/* ============================================================ P1-39 */

describe("P1-39 — Complaint Management", () => {
  let complaintId = "";
  let adminUserId = "";

  it("guest cannot create → 403", async () => {
    await req
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ category: "cleanliness", subject: "Dirty bus", description: "It was quite dirty" })
      .expect(403);
  });

  it("full lifecycle open → assigned → resolved → closed, with feedback + attachments", async () => {
    adminUserId = (
      await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${adminToken}`).expect(200)
    ).body.data.user._id;

    const created = await req
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        category: "bus_delay",
        subject: "Bus never came",
        description: "Waited 40 minutes at Beta Junction",
        relatedRoute: routeMain,
        attachmentKeys: ["complaint/2026/08/31/abc.jpg"],
      })
      .expect(201);
    complaintId = created.body.data.complaint._id;
    expect(created.body.data.complaint.status).toBe("OPEN");
    expect(created.body.data.complaint.attachments).toHaveLength(1);

    await req
      .post(`/api/v1/admin/complaints/${complaintId}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assigneeId: adminUserId })
      .expect(200)
      .expect((r) => expect(r.body.data.complaint.status).toBe("IN_PROGRESS"));

    await req
      .post(`/api/v1/complaints/${complaintId}/attachments`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ key: "complaint/2026/08/31/def.pdf" })
      .expect(200);

    await req
      .post(`/api/v1/admin/complaints/${complaintId}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ note: "Apologised and issued a travel credit" })
      .expect(200)
      .expect((r) => expect(r.body.data.complaint.status).toBe("RESOLVED"));

    await req
      .post(`/api/v1/complaints/${complaintId}/feedback`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ rating: 4, comment: "Handled well" })
      .expect(200)
      .expect((r) => expect(r.body.data.complaint.feedback.rating).toBe(4));

    await req
      .post(`/api/v1/admin/complaints/${complaintId}/close`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(200)
      .expect((r) => expect(r.body.data.complaint.status).toBe("CLOSED"));
  });

  it("escalation changes assignee + records history + audit", async () => {
    const created = await req
      .post("/api/v1/complaints")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ category: "safety", subject: "Rash driving", description: "Driver was speeding on Main Line" })
      .expect(201);
    const id = created.body.data.complaint._id;

    const esc = await req
      .post(`/api/v1/admin/complaints/${id}/escalate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ assigneeId: adminUserId, reason: "Repeat offender, safety risk" })
      .expect(200);
    expect(esc.body.data.complaint.status).toBe("ESCALATED");
    expect(esc.body.data.complaint.assignedTo).toBe(adminUserId);
    expect(esc.body.data.complaint.escalationLevel).toBe(1);

    const hist = await req
      .get(`/api/v1/admin/complaints/${id}/history`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(hist.body.data.history.map((h: { action: string }) => h.action)).toContain("escalated");
  });

  it("cannot resolve a closed complaint", async () => {
    await req
      .post(`/api/v1/admin/complaints/${complaintId}/resolve`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ note: "too late" })
      .expect(409);
  });
});

/* ============================================================ P1-40 */

describe("P1-40 — Lost & Found", () => {
  it("matching suggests candidates by route + date window", async () => {
    const day = new Date("2026-08-20T10:00:00.000Z");

    const lost = await req
      .post("/api/v1/lost-found")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        kind: "LOST",
        title: "Black umbrella",
        description: "Compact black umbrella left on the seat",
        category: "umbrella",
        route: routeMain,
        occurredAt: day.toISOString(),
      })
      .expect(201);

    // a FOUND report 1 day later on the same route -> should match
    await req
      .post("/api/v1/lost-found")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        kind: "FOUND",
        title: "Umbrella handed in",
        description: "Black compact umbrella found under a seat",
        category: "umbrella",
        route: routeMain,
        occurredAt: new Date(day.getTime() + 86400000).toISOString(),
      })
      .expect(201);

    // a FOUND report on a different route -> should NOT match
    await req
      .post("/api/v1/lost-found")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        kind: "FOUND",
        title: "Umbrella",
        description: "Black umbrella",
        route: routeCross,
        occurredAt: new Date(day.getTime() + 86400000).toISOString(),
      })
      .expect(201);

    const res = await req
      .get(`/api/v1/admin/lost-found/${lost.body.data.item._id}/matches?windowDays=3`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.matches).toHaveLength(1);
    expect(res.body.data.matches[0].item.title).toBe("Umbrella handed in");
  });

  it("return confirmation closes both records", async () => {
    const day = new Date("2026-07-01T08:00:00.000Z");
    const lost = await req
      .post("/api/v1/lost-found")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ kind: "LOST", title: "Wallet", description: "Brown leather wallet", route: routeMain, occurredAt: day.toISOString() })
      .expect(201);
    const found = await req
      .post("/api/v1/lost-found")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        kind: "FOUND",
        title: "Wallet found",
        description: "Brown leather wallet handed to depot",
        route: routeMain,
        occurredAt: new Date(day.getTime() + 3600000).toISOString(),
      })
      .expect(201);

    const res = await req
      .post(`/api/v1/admin/lost-found/${lost.body.data.item._id}/confirm-return`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ matchId: found.body.data.item._id, returnedTo: "passenger @ depot" })
      .expect(200);
    expect(res.body.data.item.status).toBe("RETURNED");
    expect(res.body.data.match.status).toBe("RETURNED");
    expect(res.body.data.item.matchedWith).toBe(found.body.data.item._id);
    expect(res.body.data.match.matchedWith).toBe(lost.body.data.item._id);
  });

  it("guest cannot report → 403", async () => {
    await req
      .post("/api/v1/lost-found")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ kind: "LOST", title: "Keys", description: "House keys", occurredAt: new Date().toISOString() })
      .expect(403);
  });
});
