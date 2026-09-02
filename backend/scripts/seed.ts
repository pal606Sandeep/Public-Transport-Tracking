import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import logger from "../src/utils/logger.js";

const PERMISSIONS = ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN", "APPROVE", "MANAGE"];

/**
 * Role -> permissions mapping (RBAC baseline).
 * Permission codes are prefixed by resource for per-resource authorization:
 * e.g. CREATE:user, VIEW:ticket, APPROVE:document.
 * The core verbs are expanded against any resource name passed at runtime.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.slice(),
  ADMIN: PERMISSIONS.slice(),
  TRANSPORT_MANAGER: ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN", "APPROVE"],
  DISPATCHER: ["VIEW", "CREATE", "UPDATE", "ASSIGN"],
  MAINTENANCE_MANAGER: ["VIEW", "CREATE", "UPDATE", "APPROVE"],
  SUPPORT_STAFF: ["VIEW", "UPDATE"],
  DRIVER: ["VIEW", "UPDATE"],
  CONDUCTOR: ["VIEW", "CREATE", "UPDATE"],
  PASSENGER: ["VIEW", "CREATE"],
  GUEST: ["VIEW"],
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Full system access.",
  ADMIN: "Administrative access with approved manage scope.",
  TRANSPORT_MANAGER: "Manages transport operations.",
  DISPATCHER: "Dispatches trips and assignments.",
  MAINTENANCE_MANAGER: "Manages maintenance and document approvals.",
  SUPPORT_STAFF: "Handles passenger support and complaints.",
  DRIVER: "Operates assigned vehicles.",
  CONDUCTOR: "Manages onboard fares and tickets.",
  PASSENGER: "Uses the passenger journey and ticketing features.",
  GUEST: "Read-only, short-lived visitor sessions.",
};

const DEFAULT_SYSTEM_SETTINGS = [
  {
    key: "organization",
    value: { name: "City Transit Authority", city: "Unknown City" },
  },
  { key: "operatingHours", value: { start: "06:00", end: "23:00" } },
  { key: "checklistBlocksTripStart", value: false },
  { key: "gpsSendIntervalSeconds", value: 7 },
  { key: "offlineVehicleTimeoutSeconds", value: 120 },
  { key: "geofenceRadiusMeters", value: 100 },
  { key: "mapTileSource", value: "openstreetmap" },
  { key: "minSupportedAppVersion", value: "1.0.0" },
  {
    key: "delayThresholds",
    value: { onTime: 0, delayed: 5, severe: 15 },
  },
  {
    key: "etaThresholds",
    value: { low: 5, medium: 15, high: 30 },
  },
  {
    key: "featureFlags",
    value: { preTripChecklist: true, liveTracking: true },
  },
  { key: "vapidPublicKey", value: process.env.VAPID_PUBLIC_KEY || "" },
];

async function seedPermissions(db: mongoose.mongo.Db): Promise<string[]> {
  const col = db.collection("permissions");
  const created: string[] = [];
  for (const code of PERMISSIONS) {
    await col.updateOne(
      { code },
      { $setOnInsert: { code, name: code.toLowerCase(), description: `Permission to ${code.toLowerCase()}` } },
      { upsert: true }
    );
    created.push(code);
  }
  logger.info(`Permissions ensured: ${created.length}`);
  return created;
}

async function seedRoles(db: mongoose.mongo.Db): Promise<void> {
  const col = db.collection("roles");
  for (const [code, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await col.updateOne(
      { code },
      {
        $setOnInsert: {
          code,
          name: code.replace(/_/g, " "),
          description: ROLE_DESCRIPTIONS[code],
          // role -> permissions mapping embedded on the role (RBAC design).
          permissions,
        },
      },
      { upsert: true }
    );
  }
  logger.info(`Roles ensured: ${Object.keys(ROLE_PERMISSIONS).length}`);
}

async function seedSystemSettings(db: mongoose.mongo.Db): Promise<void> {
  const col = db.collection("systemsettings");
  for (const setting of DEFAULT_SYSTEM_SETTINGS) {
    await col.updateOne(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
  }
  logger.info(`System settings ensured: ${DEFAULT_SYSTEM_SETTINGS.length}`);
}

async function seedAdminUser(db: mongoose.mongo.Db): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@transit.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await db.collection("users").findOne({ email: adminEmail });
  if (existing) {
    logger.info(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.collection("users").insertOne({
    name: "System Administrator",
    email: adminEmail,
    password: passwordHash,
    role: "SUPER_ADMIN",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  logger.info(`Admin user created: ${adminEmail} (SUPER_ADMIN)`);
}

/**
 * A tiny but complete demo network so the stack is usable straight after a
 * seed — no GPS simulator required. Everything is upserted on a natural key
 * (stop code / route number / registration number / schedule code), so
 * re-running the seed is safe and won't duplicate rows.
 *
 * Skip with SEED_NETWORK=false.
 */

// A short arc through central Bengaluru: [lng, lat]. Matches scripts/sim-gps.mjs
// so the simulator and the seeded network sit on the same map.
const LINE: [number, number][] = [
  [77.5946, 12.9716],
  [77.6033, 12.9762],
  [77.6101, 12.9784],
  [77.6169, 12.9723],
  [77.6212, 12.9665],
  [77.6278, 12.9611],
];

const STOP_NAMES = [
  "Majestic",
  "Cubbon Park",
  "MG Road",
  "Trinity",
  "Halasuru",
  "Indiranagar",
];

async function upsertGetId(
  col: mongoose.mongo.Collection,
  match: Record<string, unknown>,
  doc: Record<string, unknown>
): Promise<mongoose.mongo.BSON.ObjectId> {
  const now = new Date();
  await col.updateOne(
    match,
    { $setOnInsert: { ...doc, createdAt: now, updatedAt: now } },
    { upsert: true }
  );
  const found = await col.findOne(match, { projection: { _id: 1 } });
  return found!._id as mongoose.mongo.BSON.ObjectId;
}

async function seedNetwork(db: mongoose.mongo.Db): Promise<void> {
  if ((process.env.SEED_NETWORK || "true").toLowerCase() === "false") {
    logger.info("Network seed skipped (SEED_NETWORK=false)");
    return;
  }

  const stops = db.collection("stops");
  const routes = db.collection("routes");
  const vehicles = db.collection("vehicles");
  const schedules = db.collection("schedules");
  const fareRules = db.collection("farerules");
  const fares = db.collection("fares");
  const passes = db.collection("passes");
  const concessions = db.collection("concessions");

  // Stops
  const stopIds: mongoose.mongo.BSON.ObjectId[] = [];
  for (let i = 0; i < LINE.length; i++) {
    const code = `SEED-S${i + 1}`;
    const id = await upsertGetId(stops, { code }, {
      name: STOP_NAMES[i],
      code,
      location: { type: "Point", coordinates: LINE[i] },
      accessibility: i % 2 === 0,
      isActive: true,
      deletedAt: null,
    });
    stopIds.push(id);
  }

  // Forward + reverse route
  const mkOrdered = (ids: mongoose.mongo.BSON.ObjectId[]) =>
    ids.map((stopId, seq) => ({ stopId, sequence: seq, scheduledOffsetMinutes: seq * 4 }));

  const fwdId = await upsertGetId(routes, { routeNumber: "S1" }, {
    routeNumber: "S1",
    name: "Majestic → Indiranagar",
    status: "ACTIVE",
    source: stopIds[0],
    destination: stopIds[stopIds.length - 1],
    distanceKm: 8.5,
    estimatedDurationMin: 24,
    direction: "UP",
    geometry: { type: "LineString", coordinates: LINE },
    orderedStops: mkOrdered(stopIds),
    stops: stopIds,
    deletedAt: null,
  });

  const revStops = [...stopIds].reverse();
  const revId = await upsertGetId(routes, { routeNumber: "S1R" }, {
    routeNumber: "S1R",
    name: "Indiranagar → Majestic",
    status: "ACTIVE",
    source: revStops[0],
    destination: revStops[revStops.length - 1],
    distanceKm: 8.5,
    estimatedDurationMin: 24,
    direction: "DOWN",
    geometry: { type: "LineString", coordinates: [...LINE].reverse() },
    orderedStops: mkOrdered(revStops),
    stops: revStops,
    deletedAt: null,
  });

  // Back-link stops -> routes
  await stops.updateMany({ _id: { $in: stopIds } }, { $addToSet: { routes: fwdId } });
  await stops.updateMany({ _id: { $in: revStops } }, { $addToSet: { routes: revId } });

  // Vehicles
  const vehicleIds: mongoose.mongo.BSON.ObjectId[] = [];
  const vehicleSpecs = [
    { registrationNumber: "KA01-F-1001", type: "BUS", capacity: 40, assignedRoute: fwdId },
    { registrationNumber: "KA01-F-1002", type: "BUS", capacity: 40, assignedRoute: revId },
    { registrationNumber: "KA01-F-1003", type: "MINIBUS", capacity: 22, assignedRoute: fwdId },
  ];
  for (const spec of vehicleSpecs) {
    const id = await upsertGetId(vehicles, { registrationNumber: spec.registrationNumber }, {
      ...spec,
      status: "ACTIVE",
      wheelchairAccessible: spec.capacity >= 40,
      deletedAt: null,
    });
    vehicleIds.push(id);
  }

  // Schedules
  await upsertGetId(schedules, { code: "SEED-SCH-S1" }, {
    name: "S1 Weekday",
    code: "SEED-SCH-S1",
    route: fwdId,
    vehicle: vehicleIds[0],
    frequencyType: "WEEKLY",
    daysOfWeek: [1, 2, 3, 4, 5],
    departureTimes: ["06:00", "06:30", "07:00", "07:30", "08:00", "09:00", "17:00", "18:00", "19:00"],
    durationMin: 24,
    isActive: true,
    deletedAt: null,
  });
  await upsertGetId(schedules, { code: "SEED-SCH-S1R" }, {
    name: "S1R Weekday",
    code: "SEED-SCH-S1R",
    route: revId,
    vehicle: vehicleIds[1],
    frequencyType: "WEEKLY",
    daysOfWeek: [1, 2, 3, 4, 5],
    departureTimes: ["06:15", "06:45", "07:15", "07:45", "08:15", "09:15", "17:15", "18:15", "19:15"],
    durationMin: 24,
    isActive: true,
    deletedAt: null,
  });

  // Fare rule + a couple of flat route fares
  await upsertGetId(fareRules, { name: "Standard" }, {
    name: "Standard",
    description: "Default distance-based fare rule.",
    baseFare: 10,
    perStopFare: 2,
    perKmFare: 1.5,
    minimumFare: 10,
    currency: "INR",
    acceptedPaymentMethods: ["QR", "CASH", "CARD", "UPI"],
    isActive: true,
    deletedAt: null,
  });
  await upsertGetId(fares, { name: "S1 flat" }, {
    name: "S1 flat", type: "ROUTE", route: fwdId, amount: 25, priority: 1, isActive: true, deletedAt: null,
  });
  await upsertGetId(fares, { name: "S1R flat" }, {
    name: "S1R flat", type: "ROUTE", route: revId, amount: 25, priority: 1, isActive: true, deletedAt: null,
  });

  // Buyable passes (surfaced by GET /fares/passes)
  const passSpecs = [
    { name: "Day Pass", type: "DAILY", price: 60, durationDays: 1 },
    { name: "Weekly Pass", type: "WEEKLY", price: 300, durationDays: 7 },
    { name: "Monthly Pass", type: "MONTHLY", price: 1000, durationDays: 30 },
    { name: "Student Monthly", type: "STUDENT", price: 500, durationDays: 30 },
  ];
  for (const p of passSpecs) {
    await upsertGetId(passes, { name: p.name }, {
      ...p, currency: "INR", unlimited: true, isActive: true, validFrom: null, validTo: null, deletedAt: null,
    });
  }

  // Concessions (surfaced by GET /fares/concessions)
  const concessionSpecs = [
    { name: "Student", code: "STUDENT", type: "STUDENT", discountPercent: 50 },
    { name: "Senior Citizen", code: "SENIOR", type: "SENIOR", discountPercent: 40 },
    { name: "Disabled", code: "DISABLED", type: "DISABLED", discountPercent: 100 },
  ];
  for (const c of concessionSpecs) {
    await upsertGetId(concessions, { code: c.code }, {
      ...c, isActive: true, validFrom: null, validTo: null, maxPerDay: null, deletedAt: null,
    });
  }

  logger.info(
    `Network ensured: ${stopIds.length} stops, 2 routes, ${vehicleIds.length} vehicles, 2 schedules, ` +
      `${passSpecs.length} passes, ${concessionSpecs.length} concessions`
  );
}

async function seed(uri?: string): Promise<void> {
  if (uri) {
    process.env.MONGO_URI = uri;
  }
  await connectDB({ retries: 1 });

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Could not obtain database handle from mongoose connection");
  }

  await seedPermissions(db);
  await seedRoles(db);
  await seedSystemSettings(db);
  await seedAdminUser(db);
  await seedNetwork(db);

  await mongoose.disconnect();
  logger.info("Seed complete");
}

// Allow running as a script: `npm run seed` or `tsx scripts/seed.ts`
if (process.argv[1] && process.argv[1].includes("seed")) {
  seed().catch((error) => {
    logger.error(`Seed failed: ${(error as Error).message}`);
    process.exit(1);
  });
}

export default seed;
