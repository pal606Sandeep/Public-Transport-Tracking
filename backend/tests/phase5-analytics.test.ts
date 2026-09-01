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
import { User } from "../src/modules/user/user.model.js";
import { Passenger } from "../src/modules/passenger/passenger.model.js";
import { Vehicle } from "../src/modules/vehicle/vehicle.model.js";
import { Driver } from "../src/modules/driver/driver.model.js";
import { Route } from "../src/modules/route/route.model.js";
import { Trip } from "../src/modules/trip/trip.model.js";
import { Ticket } from "../src/modules/ticket/ticket.model.js";
import { Payment } from "../src/modules/payment/payment.model.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;
let guestToken: string;

let routeId: string;
let vehicleId: string;
let driverId: string;
let passengerUserId: string;
const now = Date.now();

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;

  // reference seeded passenger user
  const pUser = await User.findOne({ email: USER_EMAIL }).lean();
  passengerUserId = pUser!._id.toString();

  // seed structures
  const route = await Route.create({
    routeNumber: "ANA-1",
    name: "Analytics Route",
    distanceKm: 10,
    estimatedDurationMin: 30,
    geometry: { type: "LineString", coordinates: [[73.85, 18.5], [73.86, 18.51]] },
  });
  routeId = route._id.toString();
  const vehicle = await Vehicle.create({ registrationNumber: "KA-93-ANA-2026", type: "STANDARD", capacity: 40, status: "ACTIVE" });
  vehicleId = vehicle._id.toString();
  const driver = await Driver.create({
    user: passengerUserId,
    name: "Ana Driver",
    employeeId: "DRV-ANA-1",
    licenseNumber: "LI-ANA-1",
    status: "ACTIVE",
    attendance: [{ date: new Date(now - 3600e3), checkIn: new Date(now - 3600e3), checkOut: new Date(now - 1800e3) }],
  });
  driverId = driver._id.toString();

  // known passenger (for new / active analytics)
  await Passenger.create({ userId: new Types.ObjectId(passengerUserId) });

  // completed trip with summary
  await Trip.create({
    route: route._id,
    vehicle: vehicle._id,
    driver: driver._id,
    status: "COMPLETED",
    scheduledStartAt: new Date(now - 2 * 3600e3),
    startTime: new Date(now - 2 * 3600e3),
    endTime: new Date(now - 3600e3),
    summary: {
      totalDistanceMeters: 10000,
      movingTimeSeconds: 1800,
      idleTimeSeconds: 300,
      onTimePercentage: 80,
      overallDelaySeconds: 120,
      averageSpeedKmh: 20,
      maxSpeedKmh: 40,
      readyAt: Date.now(),
    },
    passengerSummary: { onBoard: 20, boarded: 25, alighted: 5, perStop: [], updatedAt: new Date() },
  });

  // a ticket (active passenger + peak hours + popular route/stop)
  await Ticket.create({
    user: new Types.ObjectId(passengerUserId),
    ticketCodeHash: `ana-${Date.now()}`,
    ticketCodeHint: "AN1",
    route: route._id,
    routeNumber: "ANA-1",
    amount: 15,
    status: "CONFIRMED",
    boardingStopName: "Central",
    createdAt: new Date(now - 1000),
  });

  // a revenue payment
  await Payment.create({
    user: new Types.ObjectId(passengerUserId),
    ticket: null,
    amount: 60,
    currency: "INR",
    method: "UPI",
    provider: "test",
    status: "SUCCESS",
    payableFor: "ticket",
    metadata: { routeId },
    confirmedAt: new Date(now - 1000),
  });
});

afterAll(async () => {
  await shutdown();
});

describe("P1-50 — Analytics", () => {
  it("guest and passenger cannot read analytics → 403", async () => {
    for (const ep of ["passengers", "vehicles", "drivers", "routes", "revenue"]) {
      await req.get(`/api/v1/admin/analytics/${ep}`).set("Authorization", `Bearer ${passengerToken}`).expect(403);
      await req.get(`/api/v1/admin/analytics/${ep}`).set("Authorization", `Bearer ${guestToken}`).expect(403);
    }
  });

  it("passenger analytics: counts, popular routes/stops, peak hours", async () => {
    const d = (await req
      .get(`/api/v1/admin/analytics/passengers?from=${now - 60 * 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;

    expect(d.total).toBeGreaterThanOrEqual(1);
    expect(d.activePassengers).toBeGreaterThanOrEqual(1);
    expect(d.popularRoutes.some((r: Record<string, unknown>) => r.routeId === routeId && r.count >= 1)).toBe(true);
    expect(d.popularStops.some((s: Record<string, unknown>) => s.stop === "Central" && s.count >= 1)).toBe(true);
    expect(d.peakHours.length).toBeGreaterThanOrEqual(1);
  });

  it("vehicle analytics: trips, distance, utilization", async () => {
    const d = (await req
      .get(`/api/v1/admin/analytics/vehicles?from=${now - 60 * 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.totalVehicles).toBeGreaterThanOrEqual(1);
    expect(d.totals.trips).toBeGreaterThanOrEqual(1);
    expect(d.totals.distanceKm).toBeGreaterThanOrEqual(10);
    const v = d.perVehicle.find((x: Record<string, unknown>) => x.vehicleId === vehicleId);
    expect(v).toBeTruthy();
    expect(v.trips).toBe(1);
  });

  it("driver analytics: trips completed, attendance, working hours", async () => {
    const d = (await req
      .get(`/api/v1/admin/analytics/drivers?from=${now - 60 * 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.totalDrivers).toBeGreaterThanOrEqual(1);
    expect(d.totals.tripsCompleted).toBeGreaterThanOrEqual(1);
    const drv = d.perDriver.find((x: Record<string, unknown>) => x.driverId === driverId);
    expect(drv).toBeTruthy();
    expect(drv.attendanceDays).toBeGreaterThanOrEqual(1);
  });

  it("route analytics: trips, on-time, delay stats", async () => {
    const d = (await req
      .get(`/api/v1/admin/analytics/routes?from=${now - 60 * 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.totalRoutes).toBeGreaterThanOrEqual(1);
    expect(d.totals.trips).toBeGreaterThanOrEqual(1);
    const r = d.perRoute.find((x: Record<string, unknown>) => x.routeId === routeId);
    expect(r).toBeTruthy();
    expect(r.trips).toBe(1);
    expect(r.averageTravelMinutes).toBeGreaterThan(0);
  });

  it("revenue analytics: totals, byMethod, date filtering", async () => {
    const d = (await req
      .get(`/api/v1/admin/analytics/revenue?from=${now - 60 * 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.totals.revenue).toBe(60);
    expect(d.totals.transactions).toBe(1);
    expect(d.byMethod.some((m: Record<string, unknown>) => m.method === "UPI" && m.amount === 60)).toBe(true);

    // future-only window excludes the payment
    const empty = (await req
      .get(`/api/v1/admin/analytics/revenue?from=${now + 60 * 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(empty.totals.revenue).toBe(0);
  });
});
