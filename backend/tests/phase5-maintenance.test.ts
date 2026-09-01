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
let guestToken: string;

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
    .send({ registrationNumber: "KA-93-MNT-2026", model: "MT", type: "STANDARD", capacity: 40 })
    .expect(201);
  vehicleId = veh.body.data.vehicle._id;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-48 — Maintenance + vehicle documents + expiry jobs", () => {
  it("guest and passenger cannot read maintenance → 403", async () => {
    await req
      .get(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance`)
      .set("Authorization", `Bearer ${passengerToken}`)
      .expect(403);
    await req
      .post("/api/v1/admin/maintenance/run-jobs")
      .set("Authorization", `Bearer ${guestToken}`)
      .expect(403);
  });

  it("service record lifecycle: create → list → complete → delete", async () => {
    const created = await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "SERVICE",
        title: "10k km service",
        scheduledDate: new Date(Date.now() + DAY).toISOString(),
        cost: 5000,
        odometerKm: 10000,
        provider: "Volvo Service Center",
        parts: [{ name: "Oil filter", quantity: 1, cost: 300 }],
      })
      .expect(201);
    const rec = created.body.data.record;
    expect(rec.status).toBe("SCHEDULED");

    const listed = await req
      .get(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance?status=SCHEDULED`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.data.records.some((r: Record<string, unknown>) => r._id === rec._id)).toBe(true);

    const completed = await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance/${rec._id}/complete`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(completed.body.data.record.status).toBe("COMPLETED");
    expect(completed.body.data.record.completedAt).toBeTruthy();

    await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance/${rec._id}/complete`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(409);

    await req
      .delete(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance/${rec._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    await req
      .get(`/api/v1/admin/maintenance/vehicles/${vehicleId}/maintenance/${rec._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });

  it("creates vehicle documents with status derived from expiry", async () => {
    const puc = await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "PUC",
        documentNumber: "PUC-001",
        expiresAt: new Date(Date.now() - DAY).toISOString(),
      })
      .expect(201);
    expect(puc.body.data.document.status).toBe("EXPIRED");

    const reg = await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "REGISTRATION",
        documentNumber: "REG-001",
        expiresAt: new Date(Date.now() + 200 * DAY).toISOString(),
      })
      .expect(201);
    expect(reg.body.data.document.status).toBe("VALID");

    await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ type: "REGISTRATION", documentNumber: "REG-002", expiresAt: new Date(Date.now() + 200 * DAY).toISOString() })
      .expect(409);
  });

  it("reminder job flags a document expiring within the threshold", async () => {
    // insurance expires well in the future → VALID with no reminder yet
    const ins = await req
      .post(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        type: "INSURANCE",
        documentNumber: "INS-001",
        expiresAt: new Date(Date.now() + 200 * DAY).toISOString(),
      })
      .expect(201);
    const docId = ins.body.data.document._id;
    expect(ins.body.data.document.reminderSentAt).toBeNull();

    // move the expiry to within the 30-day window → the job flags it EXPIRING + sends reminder
    await req
      .patch(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents/${docId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ expiresAt: new Date(Date.now() + 10 * DAY).toISOString() })
      .expect(200);

    const job = (await req
      .post("/api/v1/admin/maintenance/run-jobs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    const flagged = job.documentCheck.items.find((x: Record<string, unknown>) => x.type === "INSURANCE");
    expect(flagged.status).toBe("EXPIRING");
    expect(flagged.reminderSentAt).toBeTruthy();

    const doc = (await req
      .get(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents/${docId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data.document;
    expect(doc.status).toBe("EXPIRING");
    expect(doc.daysLeft).toBeGreaterThan(0);
  });

  it("run-jobs flags expired docs and schedules reminders once (idempotent)", async () => {
    const first = (await req
      .post("/api/v1/admin/maintenance/run-jobs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    const puc = first.documentCheck.items.find((x: Record<string, unknown>) => x.type === "PUC");
    expect(puc.status).toBe("EXPIRED");

    // second run does not re-send (reminderSentAt already set) and PUC stays EXPIRED
    const second = (await req
      .post("/api/v1/admin/maintenance/run-jobs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data;
    expect(second.documentCheck.total).toBe(first.documentCheck.total);
    expect(second.documentCheck.items.find((x: Record<string, unknown>) => x.type === "PUC").status).toBe("EXPIRED");

    const pucDocs = (await req
      .get(`/api/v1/admin/maintenance/vehicles/${vehicleId}/documents?status=EXPIRED`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data.documents;
    expect(pucDocs.length).toBeGreaterThanOrEqual(1);
  });

  it("expired document surfaces on the vehicle read", async () => {
    const v = (await req
      .get(`/api/v1/admin/vehicles/${vehicleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)).body.data.vehicle;
    expect(Array.isArray(v.documentsStatus)).toBe(true);
    const puc = v.documentsStatus.find((d: Record<string, unknown>) => d.type === "PUC");
    const ins = v.documentsStatus.find((d: Record<string, unknown>) => d.type === "INSURANCE");
    expect(puc.status).toBe("EXPIRED");
    expect(ins.status).toBe("EXPIRING");
  });
});