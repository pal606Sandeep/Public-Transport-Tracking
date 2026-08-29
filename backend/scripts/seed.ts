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
  { key: "vapidPublicKey", value: "" },
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
