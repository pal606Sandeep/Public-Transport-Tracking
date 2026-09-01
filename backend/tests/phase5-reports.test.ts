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
import { Vehicle } from "../src/modules/vehicle/vehicle.model.js";
import { Driver } from "../src/modules/driver/driver.model.js";
import { Route } from "../src/modules/route/route.model.js";
import { Trip } from "../src/modules/trip/trip.model.js";
import { Payment } from "../src/modules/payment/payment.model.js";
import { Incident } from "../src/modules/incident/incident.model.js";
import { User } from "../src/modules/user/user.model.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];
let adminToken: string;
let passengerToken: string;
let guestToken: string;

let routeId: string;
let vehicleId: string;
let driverId: string;
const now = Date.now();

beforeAll(async () => {
  const b = await boot();
  req = b.request;
  adminToken = await loginToken(req, ADMIN_EMAIL, ADMIN_PASSWORD);
  passengerToken = await loginToken(req, USER_EMAIL, USER_PASSWORD);
  guestToken = (await req.post("/api/v1/auth/guest").expect(200)).body.data.token;

  const route = await Route.create({
    routeNumber: "RPT-1",
    name: "Reports Route",
    distanceKm: 12,
    estimatedDurationMin: 35,
    geometry: { type: "LineString", coordinates: [[73.85, 18.5], [73.86, 18.51]] },
  });
  routeId = route._id.toString();
  const vehicle = await Vehicle.create({ registrationNumber: "KA-93-RPT-2026", type: "STANDARD", capacity: 40, status: "ACTIVE" });
  vehicleId = vehicle._id.toString();
  const user = await User.create({ email: `rpt-${Date.now()}@test.com`, name: "Report User", password: "Test@1234", role: "passenger" });
  const driver = await Driver.create({
    user: user._id,
    name: "Repo Driver",
    employeeId: "DRV-RPT-1",
    licenseNumber: "LI-RPT-1",
    status: "ACTIVE",
  });
  driverId = driver._id.toString();

  await Trip.create({
    route: route._id,
    vehicle: vehicle._id,
    driver: driver._id,
    status: "COMPLETED",
    scheduledStartAt: new Date(now - 2 * 3600e3),
    summary: {
      totalDistanceMeters: 12000,
      onTimePercentage: 75,
      overallDelaySeconds: 200,
      readyAt: Date.now(),
    },
  });

  await Payment.create({
    user: user._id,
    ticket: null,
    amount: 50,
    currency: "INR",
    method: "UPI",
    provider: "cash-agent",
    status: "SUCCESS",
    payableFor: "ticket",
    confirmedAt: new Date(now - 1000),
    metadata: { routeId: routeId },
  });

  await Incident.create({
    type: "breakdown",
    title: "Report incident",
    status: "OPEN",
    severity: "HIGH",
    source: "MANUAL",
    vehicleId: vehicle._id,
  });
});

afterAll(async () => {
  await shutdown();
});

describe("P1-51 — Reports", () => {
  it("guest and passenger cannot read any report → 403", async () => {
    for (const p of ["vehicles", "trips", "incidents"]) {
      await req.get(`/api/v1/admin/reports/${p}`).set("Authorization", `Bearer ${passengerToken}`).expect(403);
      await req.get(`/api/v1/admin/reports/${p}`).set("Authorization", `Bearer ${guestToken}`).expect(403);
    }
  });

  it("JSON report returns expected columns and rows", async () => {
    const d = (await req
      .get("/api/v1/admin/reports/vehicles")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.type).toBe("vehicles");
    expect(d.columns).toContain("registrationNumber");
    expect(d.rowCount).toBeGreaterThanOrEqual(1);
    const row = d.rows.find((r: string[]) => r[0] === "KA-93-RPT-2026");
    expect(row).toBeTruthy();
  });

  it("trips report includes on-time and distance columns from trip summary", async () => {
    const d = (await req
      .get(`/api/v1/admin/reports/trips?routeId=${routeId}&vehicleId=${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.columns).toEqual(expect.arrayContaining(["distanceKm", "onTimePercentage", "overallDelaySeconds"]));
    const row = d.rows[0];
    expect(row).toBeTruthy();
    expect(row[3]).toBe(12);
    expect(row[4]).toBe(75);
    expect(row[5]).toBe(200);
  });

  it("incidents report lists incident rows", async () => {
    const d = (await req
      .get(`/api/v1/admin/reports/incidents?vehicleId=${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(d.columns).toEqual(expect.arrayContaining(["type", "status", "severity"]));
    expect(d.rowCount).toBeGreaterThanOrEqual(1);
    const row = d.rows.find((r: string[]) => r[0] === "breakdown");
    expect(row).toBeTruthy();
    expect(row[3]).toBe("HIGH");
  });

  it("revenue report returns success payments as rows and filters by date", async () => {
    const past = (await req
      .get(`/api/v1/admin/reports/revenue?from=${now - 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(past.rowCount).toBe(1);
    expect(past.rows[0][1]).toBe(50);

    const future = (await req
      .get(`/api/v1/admin/reports/revenue?from=${now + 3600e3}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(future.rowCount).toBe(0);
  });

  it("CSV export returns header+rows with correct content type", async () => {
    const res = await req
      .get("/api/v1/admin/reports/vehicles/export.csv")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("vehicles-report.csv");
    const csv = res.text;
    expect(csv).toContain("registrationNumber");
    expect(csv).toContain("KA-93-RPT-2026");
  });

  it("PDF export produces a valid PDF document", async () => {
    const res = await req
      .get("/api/v1/admin/reports/vehicles/export.pdf")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    const buf = res.body as Buffer;
    expect(buf.slice(0, 5).toString("latin1")).toBe("%PDF-");
    const text = buf.toString("latin1");
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Type /Font");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("404 for unknown report type", async () => {
    await req
      .get("/api/v1/admin/reports/not-a-report")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});
