import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown, loginToken, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;
let adminToken: string;
let passengerToken: string;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
});

afterAll(async () => {
  await shutdown();
});

describe("P1-41 — Fare Management (fares, fare rules, concessions, passes)", () => {
  it("passenger (no MANAGE fare) cannot reach admin fare endpoints → 403", async () => {
    await req.get("/api/v1/admin/fares").set("Authorization", `Bearer ${passengerToken}`).expect(403);
    await req.get("/api/v1/admin/fares/rules").set("Authorization", `Bearer ${passengerToken}`).expect(403);
    await req.get("/api/v1/admin/fares/concessions").set("Authorization", `Bearer ${passengerToken}`).expect(403);
    await req.get("/api/v1/admin/fares/passes").set("Authorization", `Bearer ${passengerToken}`).expect(403);
  });

  it("admin creates a route fare", async () => {
    const res = await req
      .post("/api/v1/admin/fares")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Route 1 Standard",
        type: "ROUTE",
        route: "0123456789abcdef01234567",
        amount: 15,
        priority: 1,
      })
      .expect(201);
    expect(res.body.data.fare.name).toBe("Route 1 Standard");
    expect(res.body.data.fare.type).toBe("ROUTE");
    expect(res.body.data.fare.amount).toBe(15);
    expect(res.body.data.fare.isActive).toBe(true);
    expect(res.body.data.fare.route).toBe("0123456789abcdef01234567");
  });

  it("admin lists fares (pagination, type + isActive filter, search)", async () => {
    const list = await req.get("/api/v1/admin/fares?limit=50").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(list.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    const found = await req
      .get("/api/v1/admin/fares?type=ROUTE&isActive=true")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.fares.every((f: { type: string }) => f.type === "ROUTE")).toBe(true);
    const search = await req
      .get("/api/v1/admin/fares?search=Route 1")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(search.body.data.fares[0].name).toMatch(/Route 1/);
  });

  it("get + update fare (change amount, deactivate)", async () => {
    const res = await req
      .post("/api/v1/admin/fares")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Route 2", type: "ROUTE", amount: 10 })
      .expect(201);
    const id = res.body.data.fare._id;

    const got = await req.get(`/api/v1/admin/fares/${id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(got.body.data.fare.name).toBe("Route 2");

    const upd = await req
      .patch(`/api/v1/admin/fares/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 20, isActive: false })
      .expect(200);
    expect(upd.body.data.fare.amount).toBe(20);
    expect(upd.body.data.fare.isActive).toBe(false);
  });

  it("fare rules CRUD (base + per-stop fare)", async () => {
    const created = await req
      .post("/api/v1/admin/fares/rules")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Default Rule", baseFare: 10, perStopFare: 2, minimumFare: 5 })
      .expect(201);
    const id = created.body.data.fareRule._id;
    expect(created.body.data.fareRule.baseFare).toBe(10);
    expect(created.body.data.fareRule.currency).toBe("INR");

    const list = await req.get("/api/v1/admin/fares/rules").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(list.body.data.fareRules.some((r: { _id: string }) => r._id === id)).toBe(true);

    const upd = await req
      .patch(`/api/v1/admin/fares/rules/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ perStopFare: 3 })
      .expect(200);
    expect(upd.body.data.fareRule.perStopFare).toBe(3);
  });

  it("concessions CRUD (unique code → duplicate 409)", async () => {
    const created = await req
      .post("/api/v1/admin/fares/concessions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Student Concession", code: "STU", type: "STUDENT", discountPercent: 50 })
      .expect(201);
    expect(created.body.data.concession.code).toBe("STU");

    await req
      .post("/api/v1/admin/fares/concessions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Dup", code: "STU", type: "GENERAL", discountPercent: 10 })
      .expect(409);
  });

  it("passes CRUD (daily/weekly/monthly/student/senior)", async () => {
    const created = await req
      .post("/api/v1/admin/fares/passes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Monthly Pass", type: "MONTHLY", price: 1000, durationDays: 30 })
      .expect(201);
    const id = created.body.data.pass._id;
    expect(created.body.data.pass.type).toBe("MONTHLY");

    const list = await req.get("/api/v1/admin/fares/passes?type=MONTHLY").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(list.body.data.passes[0].price).toBe(1000);

    const upd = await req
      .patch(`/api/v1/admin/fares/passes/${id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 1200 })
      .expect(200);
    expect(upd.body.data.pass.price).toBe(1200);
  });

  it("soft-delete removes from list + recoverable via includeDeleted", async () => {
    const created = await req
      .post("/api/v1/admin/fares/passes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Temp Pass", type: "DAILY", price: 50 })
      .then((r) => r.body.data.pass) as { _id: string };

    await req.delete(`/api/v1/admin/fares/passes/${created._id}`).set("Authorization", `Bearer ${adminToken}`).expect(200);
    const gone = await req
      .get("/api/v1/admin/fares/passes?limit=100")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(gone.body.data.passes.some((p: { _id: string }) => p._id === created._id)).toBe(false);

    const found = await req
      .get(`/api/v1/admin/fares/passes/${created._id}?includeDeleted=true`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body.data.pass.name).toBe("Temp Pass");
  });
});

describe("P1-42 — Fare Calculation", () => {
  // create stops + a route once for the whole block
  let stopA = "";
  let stopB = "";
  let stopC = "";
  let routeId = "";
  let concessionId = "";

  beforeAll(async () => {
    const mk = async (name: string, code: string, lng: number): Promise<string> => {
      const r = await req
        .post("/api/v1/admin/stops")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name, code, location: { type: "Point", coordinates: [lng, 18.5] } })
        .expect(201);
      return r.body.data.stop._id;
    };
    stopA = await mk("Calc Stop A", "CALCA", 77.1);
    stopB = await mk("Calc Stop B", "CALCB", 77.2);
    stopC = await mk("Calc Stop C", "CALCC", 77.3);

    const route = await req
      .post("/api/v1/admin/routes")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        routeNumber: "CALC-1",
        name: "Calc Route",
        distanceKm: 9,
        orderedStops: [
          { stopId: stopA, sequence: 0 },
          { stopId: stopB, sequence: 1 },
          { stopId: stopC, sequence: 2 },
        ],
      })
      .expect(201);
    routeId = route.body.data.route._id;

    // A route-specific fare so the calculation is deterministic.
    await req
      .post("/api/v1/admin/fares")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Calc Route Fare", type: "ROUTE", route: routeId, amount: 15, priority: 100 })
      .expect(201);

    const conc = await req
      .post("/api/v1/admin/fares/concessions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Senior Calc", code: "SEN-CALC", type: "SENIOR", discountPercent: 50 })
      .expect(201);
    concessionId = conc.body.data.concession._id;
  });

  it("calculates a route fare — boarding A → destination C spans 2 stops", async () => {
    const res = await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ routeId, boardingStopId: stopA, destinationStopId: stopC, passengerCategory: "ADULT" })
      .expect(200);
    const r = res.body.data;
    expect(r.routeId).toBe(routeId);
    expect(r.stopsSpanned).toBe(2);
    expect(r.amount).toBe(15);
    expect(r.breakdown.rule).toBe("route");
  });

  it("auto-detects the route when routeId is omitted", async () => {
    const res = await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ boardingStopId: stopA, destinationStopId: stopC, passengerCategory: "ADULT" })
      .expect(200);
    expect(res.body.data.routeNumber).toBe("CALC-1");
    expect(res.body.data.amount).toBe(15);
  });

  it("applies a concession, reducing the amount (50% off)", async () => {
    const res = await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ routeId, boardingStopId: stopA, destinationStopId: stopC, passengerCategory: "SENIOR", concessionId })
      .expect(200);
    const r = res.body.data;
    expect(r.amount).toBe(8); // 15 * 0.5 rounded
    expect(r.appliedConcession.code).toBe("SEN-CALC");
    expect(r.appliedConcession.discountPercent).toBe(50);
  });

  it("rejects same boarding + destination → 400", async () => {
    await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ routeId, boardingStopId: stopA, destinationStopId: stopA, passengerCategory: "ADULT" })
      .expect(400);
  });

  it("rejects a stop pair with a missing/unknown stop → 400", async () => {
    await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ routeId, boardingStopId: stopA, destinationStopId: "0123456789abcdef01234567", passengerCategory: "ADULT" })
      .expect(400);
  });

  it("rejects an out-of-order stop pair (boarding after destination) → 400", async () => {
    await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({ routeId, boardingStopId: stopC, destinationStopId: stopA, passengerCategory: "ADULT" })
      .expect(400);
  });

  it("guest token can calculate fare", async () => {
    const guest = await req.post("/api/v1/auth/guest").expect(200);
    const guestToken = guest.body.data.token;
    await req
      .post("/api/v1/fares/calculate")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ routeId, boardingStopId: stopA, destinationStopId: stopC, passengerCategory: "ADULT" })
      .expect(200);
  });
});
