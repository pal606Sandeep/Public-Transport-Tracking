import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let passengerToken: string;

let stopA = "";
let stopC = "";
let routeId = "";

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);

  const mk = async (name: string, code: string, lng: number): Promise<string> => {
    const r = await req
      .post("/api/v1/admin/stops")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, code, location: { type: "Point", coordinates: [lng, 18.5] } })
      .expect(201);
    return r.body.data.stop._id;
  };
  stopA = await mk("Pay Stop A", "PAYA", 76.1);
  const stopB = await mk("Pay Stop B", "PAYB", 76.2);
  stopC = await mk("Pay Stop C", "PAYC", 76.3);

  const route = await req
    .post("/api/v1/admin/routes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      routeNumber: "PAY-1",
      name: "Payment Route",
      distanceKm: 8,
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
    .send({ name: "Pay Route Fare", type: "ROUTE", route: routeId, amount: 30, priority: 100 })
    .expect(201);

  void stopB;
});

afterAll(async () => {
  await shutdown();
});

const createPendingTicket = async (): Promise<{ _id: string }> => {
  const res = await req
    .post("/api/v1/tickets")
    .set("Authorization", `Bearer ${passengerToken}`)
    .set({ "Idempotency-Key": "pay-tkt-" + Date.now() + Math.random() })
    .send({ route: routeId, boardingStop: stopA, destinationStop: stopC, paymentMethod: "UPI" })
    .expect(201);
  expect(res.body.data.ticket.status).toBe("PENDING_PAYMENT");
  return res.body.data.ticket;
};

describe("P1-44 — Payments (webhook verification + refund)", () => {
  it("guest cannot create a payment → 403", async () => {
    const guest = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;
    await req
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${guest}`)
      .set({ "Idempotency-Key": "pay-guest" })
      .send({ amount: 30, method: "UPI", provider: "razorpay", payableFor: "ticket" })
      .expect(403);
  });

  it("creates a PENDING payment, then webhook SUCCESS confirms it + the ticket", async () => {
    const ticket = await createPendingTicket();

    const created = await req
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "pay-create-1" })
      .send({ ticket: ticket._id, amount: 30, method: "UPI", provider: "razorpay", payableFor: "ticket" })
      .expect(201);
    expect(created.body.data.payment.status).toBe("PENDING");
    const ref = created.body.data.paymentReference;

    const webhook = await req
      .post("/api/v1/payments/webhook/razorpay")
      .send({ providerRef: ref, status: "SUCCESS", amount: 30 })
      .expect(200);
    expect(webhook.body.data.replayed).toBe(false);
    expect(webhook.body.data.payment.status).toBe("SUCCESS");

    // ticket is now confirmed
    const t = await req.get(`/api/v1/tickets/${ticket._id}`).set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(t.body.data.ticket.status).toBe("CONFIRMED");
  });

  it("replayed webhook is idempotent (does not double-confirm)", async () => {
    const ticket = await createPendingTicket();
    const created = await req
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "pay-create-replay" })
      .send({ ticket: ticket._id, amount: 30, method: "CARD", provider: "razorpay", payableFor: "ticket" })
      .expect(201);
    const ref = created.body.data.paymentReference;

    await req.post("/api/v1/payments/webhook/razorpay").send({ providerRef: ref, status: "SUCCESS" }).expect(200);
    const replay = await req.post("/api/v1/payments/webhook/razorpay").send({ providerRef: ref, status: "SUCCESS" }).expect(200);
    expect(replay.body.data.replayed).toBe(true);
    expect(replay.body.data.payment.status).toBe("SUCCESS");
  });

  it("webhook FAILED records a failed payment (ticket stays pending)", async () => {
    const ticket = await createPendingTicket();
    const created = await req
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "pay-fail" })
      .send({ ticket: ticket._id, amount: 30, method: "UPI", provider: "razorpay", payableFor: "ticket" })
      .expect(201);
    const ref = created.body.data.paymentReference;

    const fail = await req
      .post("/api/v1/payments/webhook/razorpay")
      .send({ providerRef: ref, status: "FAILED", failureReason: "Insufficient funds" })
      .expect(200);
    expect(fail.body.data.payment.status).toBe("FAILED");
    expect(fail.body.data.payment.failedReason).toBe("Insufficient funds");

    const t = await req.get(`/api/v1/tickets/${ticket._id}`).set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(t.body.data.ticket.status).toBe("PENDING_PAYMENT");
  });

  it("lists payment history + filters by status", async () => {
    const list = await req.get("/api/v1/payments").set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(list.body.data.payments.length).toBeGreaterThanOrEqual(3);
    const success = await req.get("/api/v1/payments?status=SUCCESS").set("Authorization", `Bearer ${passengerToken}`).expect(200);
    expect(success.body.data.payments.every((p: { status: string }) => p.status === "SUCCESS")).toBe(true);
  });

  it("admin refunds a successful payment → REFUNDED", async () => {
    const ticket = await createPendingTicket();
    const created = await req
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "pay-refund" })
      .send({ ticket: ticket._id, amount: 30, method: "WALLET", provider: "paytm", payableFor: "ticket" })
      .expect(201);
    const ref = created.body.data.paymentReference;
    const payId = created.body.data.payment._id;

    await req.post("/api/v1/payments/webhook/paytm").send({ providerRef: ref, status: "SUCCESS" }).expect(200);

    // non-admin cannot refund
    await req.post(`/api/v1/admin/payments/${payId}/refund`).set("Authorization", `Bearer ${passengerToken}`).send({}).expect(403);

    const refund = await req
      .post(`/api/v1/admin/payments/${payId}/refund`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "user request" })
      .expect(200);
    expect(refund.body.data.payment.status).toBe("REFUNDED");
    expect(refund.body.data.refunded).toBe(true);
  });

  it("cannot refund a non-successful payment → 409", async () => {
    const created = await req
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${passengerToken}`)
      .set({ "Idempotency-Key": "pay-norefund" })
      .send({ amount: 30, method: "UPI", provider: "razorpay", payableFor: "pass" })
      .expect(201);
    const payId = created.body.data.payment._id;
    const res = await req
      .post(`/api/v1/admin/payments/${payId}/refund`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
      .expect(409);
    expect(res.body.error.code).toBe("PAYMENT_NOT_REFUNDABLE");
  });
});
