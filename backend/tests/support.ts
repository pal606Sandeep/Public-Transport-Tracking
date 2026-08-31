import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import migrateMongo from "migrate-mongo";
import bcrypt from "bcryptjs";
import request from "supertest";
import { Permission, Role } from "../src/models/role.model.js";
import { SystemSetting } from "../src/models/systemSetting.model.js";
import { User } from "../src/modules/user/user.model.js";

export let app: Express.Application;
export let replSet: MongoMemoryReplSet;
export let uri: string;

const PERMISSIONS = ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN", "APPROVE", "MANAGE"];

const ROLES: Record<string, string[]> = {
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

const SETTINGS: Record<string, unknown>[] = [
  { key: "gpsSendIntervalSeconds", value: 7 },
  { key: "geofenceRadiusMeters", value: 100 },
  { key: "etaThresholds", value: { low: 5, medium: 15, high: 30 } },
  { key: "delayThresholds", value: { onTime: 0, delayed: 5, severe: 15 } },
  { key: "mapTileSource", value: "openstreetmap" },
  { key: "supportedLanguages", value: ["en"] },
  { key: "minSupportedAppVersion", value: "1.0.0" },
  { key: "featureFlags", value: { preTripChecklist: true, liveTracking: true } },
  { key: "vapidPublicKey", value: "test-vapid" },
  { key: "organization", value: { name: "Test Authority", city: "Test City" } },
  { key: "checklistBlocksTripStart", value: false },
  { key: "offlineVehicleTimeoutSeconds", value: 120 },
];

export const ADMIN_EMAIL = "admin@transit.test";
export const ADMIN_PASSWORD = "AdminPass123!";
export const USER_EMAIL = "user@test.com";
export const USER_PASSWORD = "Password123!";
export const DRIVER_EMAIL = "driver@test.com";
export const DRIVER_PASSWORD = "DriverPass123!";
export const CONDUCTOR_EMAIL = "conductor@test.com";
export const CONDUCTOR_PASSWORD = "ConductorPass123!";

async function seedData(): Promise<void> {
  for (const code of PERMISSIONS) {
    await Permission.updateOne({ code }, { $setOnInsert: { code, name: code.toLowerCase() } }, { upsert: true });
  }
  for (const [code, perms] of Object.entries(ROLES)) {
    await Role.updateOne(
      { code },
      { $setOnInsert: { code, name: code.replace(/_/g, " "), permissions: perms, isSystem: true } },
      { upsert: true }
    );
  }
  for (const s of SETTINGS) {
    await SystemSetting.updateOne({ key: s.key }, { $setOnInsert: s }, { upsert: true });
  }

  await User.create({
    name: "Admin",
    email: ADMIN_EMAIL,
    password: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: "SUPER_ADMIN",
    isActive: true,
  });
  await User.create({
    name: "Regular User",
    email: USER_EMAIL,
    password: bcrypt.hashSync(USER_PASSWORD, 10),
    role: "PASSENGER",
    isActive: true,
  });
  await User.create({
    name: "Driver",
    email: DRIVER_EMAIL,
    password: bcrypt.hashSync(DRIVER_PASSWORD, 10),
    role: "DRIVER",
    isActive: true,
  });
  await User.create({
    name: "Conductor",
    email: CONDUCTOR_EMAIL,
    password: bcrypt.hashSync(CONDUCTOR_PASSWORD, 10),
    role: "CONDUCTOR",
    isActive: true,
  });
}

export const boot = async (): Promise<{ uri: string; request: typeof request }> => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await replSet.waitUntilRunning();
  uri = replSet.getUri("transport_tracking");

  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = "test-secret-please-change";
  process.env.NODE_ENV = "test";
  process.env.JWT_EXPIRES_IN = "15m";
  process.env.REFRESH_EXPIRES_DAYS = "30";
  process.env.GUEST_EXPIRES_IN = "1d";

  await mongoose.connect(uri);

  const db = mongoose.connection.db!;
  const client = mongoose.connection.getClient() as unknown as import("mongodb").MongoClient;
  await migrateMongo.up(db, client);

  await seedData();

  // Import app AFTER env is set so runtime config resolves correctly.
  const { default: app } = await import("../src/app.js");
  return { uri, request: request(app) };
};

export const shutdown = async (): Promise<void> => {
  await mongoose.connection.close();
  if (replSet) await replSet.stop();
};

/** Helper to obtain an access token for a user. */
export const loginToken = async (
  req: import("supertest").SuperTest<import("supertest").Test>,
  email: string,
  password: string
): Promise<string> => {
  const res = await req.post("/api/v1/auth/login").send({ email, password }).expect(200);
  return res.body.data.accessToken;
};
