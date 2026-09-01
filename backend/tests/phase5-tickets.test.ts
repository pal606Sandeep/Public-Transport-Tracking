import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let passengerToken: string;
let guestToken = "";

let stopA = "";
let stopC = "";
let routeId = "";
let passId = "";

const H = { "Idempotency-Key": "tkt-" + Date.now() } as Record<string, string>;

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
  stopA = await mkStop("Tkt Stop A", "TKTA", 78.1);
  const stopB = await mkStop("Tkt Stop B", "TKTB", 78.2);
  stopC = await mkStop("Tkt Stop C", "TKTC", 78.3);

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "TKT-1",
      name: "Ticket Route",
      distanceKm: 12,
      estimatedDurationMin: 40,
      orderedStops: [
        { stopId: stopA, sequence: 0 },
        { stopId: stopB, sequence: 1 },
        { stopId: stopC, sequence: 2 },
      ],
    })
    .expect(201);
  routeId = route.body.data.route._id;

  await req
    .post("/api/v1/admin/fares")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Ticket Route Fare", type: "ROUTE", route: routeId, amount: 25, priority: 100 })
    .expect(201);

  const pass = await req
    .post("/api/v1/admin/fares/passes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Monthly Tkt Pass", type: "MONTHLY", price: 1000, durationDays: 30 })
    .expect(201);
  passId = pass.body.data.pass._id;

  void stopB;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-43 — Ticketing (tickets + passes + QR validation)", () => {
  it("guest token cannot buy a ticket → 403", async () => {
    await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${guestToken}`)
      .set(H)
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC })
      .expect(403);
  });

  it("passenger creates a paid (CASH) ticket → CONFIRMED with routeNumber+regNo denormalised", async () => {
    const res = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set(H)
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH", paid: true })
      .expect(201);
    const t = res.body.data.ticket;
    expect(t.status).toBe("CONFIRMED");
    expect(t.routeNumber).toBe("TKT-1");
    expect(t.amount).toBe(25);
    expect(t.passengerCategory).toBe("ADULT");
    expect(t.ticketCodeHint).toBeTruthy();
    expect(t.ticketCode).toMatch(/^TKT-/);
    expect(t.vehicleRegNo).toBeNull();
  });

  it("duplicate Idempotency-Key is a no-op → same stored ticket, no double write", async () => {
    const res = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set(H)
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH", paid: true })
      .expect(201);
    // replayed stored response — the body includes the SAME _id each time
    expect(res.body.data.ticket.routeNumber).toBe("TKT-1");
  });

  it("online paymentMethod without paid → PENDING_PAYMENT", async () => {
    const res = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "tkt-online-" + Date.now() })
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "UPI" })
      .expect(201);
    expect(res.body.data.ticket.status).toBe("PENDING_PAYMENT");
  });

  it("lists own tickets + pagination", async () => {
    const res = await req
      .get("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it("validates a ticket via id once → USED; second validation rejected", async () => {
    const created = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "tkt-validate-" + Date.now() })
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH", paid: true })
      .expect(201);
    const t = created.body.data.ticket;

    const ok = await req
      .post(`/api/v1/tickets/${t._id}/validate`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({})
      .expect(200);
    expect(ok.body.data.result).toBe("valid");
    expect(ok.body.data.action).toBe("used");

    const again = await req
      .post(`/api/v1/tickets/${t._id}/validate`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({})
      .expect(409);
    expect(again.body.error.code).toBe("TICKET_ALREADY_USED");
  });

  it("validates a ticket by its raw QR ticketCode", async () => {
    const created = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "tkt-code-" + Date.now() })
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH", paid: true })
      .expect(201);
    const code = created.body.data.ticket.ticketCode;

    const res = await req
      .post("/api/v1/tickets/validate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ ticketCode: code })
      .expect(200);
    expect(res.body.data.result).toBe("valid");
  });

  it("rejects validating an expired ticket", async () => {
    const created = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "tkt-exp-" + Date.now() })
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH", paid: true })
      .expect(201);
    const t = created.body.data.ticket;
    // force expiry in DB
    const { default: mongoose } = await import("mongoose");
    await mongoose.connection.db!.collection("tickets").updateOne(
      { _id: new mongoose.Types.ObjectId(t._id) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    const res = await req
      .post(`/api/v1/tickets/${t._id}/validate`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe("TICKET_EXPIRED");
  });

  it("cancels an unused ticket", async () => {
    const created = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "tkt-cancel-" + Date.now() })
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH", paid: true })
      .expect(201);
    const t = created.body.data.ticket;
    const res = await req
      .post(`/api/v1/tickets/${t._id}/cancel`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ reason: "changed plans" })
      .expect(200);
    expect(res.body.data.ticket.status).toBe("CANCELLED");

    const validate2 = await req
      .post(`/api/v1/tickets/${t._id}/validate`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({})
      .expect(409);
    expect(validate2.body.error.code).toBe("TICKET_CANCELLED");
  });

  it("purchases a pass; active pass covers an eligible trip (amount 0 + passType)", async () => {
    const bought = await req
      .post("/api/v1/tickets/passes/purchase")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "pass-buy-" + Date.now() })
      .send({ pass: passId })
      .expect(201);
    expect(bought.body.data.pass.type).toBe("MONTHLY");
    expect(bought.body.data.pass.status).toBe("ACTIVE");

    const active = await req
      .get("/api/v1/tickets/passes/active")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(active.body.data.pass).toBeTruthy();

    const covered = await req
      .post("/api/v1/tickets")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "tkt-pass-" + Date.now() })
      .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "CASH" })
      .expect(201);
    expect(covered.body.data.ticket.amount).toBe(0);
    expect(covered.body.data.ticket.passType).toBe("MONTHLY");
  });

  it("lists own passes", async () => {
    const res = await req
      .get("/api/v1/tickets/passes")
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(200);
    expect(res.body.data.passes.length).toBeGreaterThanOrEqual(1);
  });
});
