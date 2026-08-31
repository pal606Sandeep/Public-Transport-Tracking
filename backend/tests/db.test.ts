import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import migrateMongo from "migrate-mongo";

let replSet: MongoMemoryReplSet;
let client: MongoClient;
let db: Db;
const uri = process.env.MONGO_URI || "mongodb://localhost:27017/transport_tracking";

beforeAll(async () => {
  // Spin up a real single-node replica set in memory so transactions and
  // change streams (and rs.initiate) genuinely work during tests.
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ port: 37017 }],
  });
  await replSet.waitUntilRunning();

  client = new MongoClient(replSet.getUri("transport_tracking"));
  await client.connect();
  db = client.db("transport_tracking");

  // Point the app's MONGO_URI and migrate-mongo at the in-memory replica set.
  process.env.MONGO_URI = replSet.getUri("transport_tracking");
});

afterAll(async () => {
  await client.close();
  await replSet.stop();
});

describe("P1-02 — MongoDB replica set", () => {
  it("rs.initiate() has a PRIMARY member (single-node replica set works)", async () => {
    const status = await db.admin().command({ replSetGetStatus: 1 });
    expect(status.set).toBeTruthy();
    const members = status.members as Array<{ stateStr: string }>;
    expect(members.length).toBeGreaterThan(0);
    expect(members.some((m) => m.stateStr === "PRIMARY")).toBe(true);
  });

  it("connectDB connects and logs the host", async () => {
    // Fresh mongoose connection against the memory server URI.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { connectDB } = await import("../src/config/db.js");
      await connectDB({ retries: 1 });
      const logged = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(logged).toContain("MongoDB connected");
      expect(logged).toMatch(/MongoDB connected: (\S+)/);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("transactions (multi-document) are available on the replica set", async () => {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection("tx_a").insertOne({ value: 1 }, { session });
        await db.collection("tx_b").insertOne({ value: 2 }, { session });
        throw new Error("force rollback");
      });
    } catch {
      // expected rollback
    } finally {
      await session.endSession();
    }
    expect(await db.collection("tx_a").countDocuments()).toBe(0);
    expect(await db.collection("tx_b").countDocuments()).toBe(0);
  });
});

describe("P1-02 — migrate-mongo up + seed run clean", () => {
  it("migrate-mongo up applies the baseline migration and creates indexes", async () => {
    const result = await migrateMongo.up(db, client);
    expect(result).toBeDefined();

    const rolesIndexes = await db.collection("roles").indexes();
    const usersIndexes = await db.collection("users").indexes();
    expect(rolesIndexes.some((i) => i.name === "code_1" && i.unique)).toBe(true);
    expect(usersIndexes.some((i) => i.name === "email_1" && i.unique)).toBe(true);
  });

  it("seed inserts roles, permissions, admin user and system settings idempotently", async () => {
    // Use the app's mongoose-based seed by pointing MONGO_URI at the memory set.
    const { default: seed } = await import("../scripts/seed.js");
    await seed(process.env.MONGO_URI);

    const roles = await db.collection("roles").find({}).toArray();
    const permissions = await db.collection("permissions").find({}).toArray();
    const settings = await db.collection("systemsettings").find({}).toArray();
    const admin = await db.collection("users").findOne({ role: "SUPER_ADMIN" });

    expect(roles.length).toBeGreaterThanOrEqual(10);
    expect(permissions.length).toBeGreaterThanOrEqual(7);
    expect(settings.length).toBeGreaterThanOrEqual(10);
    expect(admin).toBeTruthy();

    // Idempotency: running seed again must not duplicate the admin user or add roles.
    await seed(process.env.MONGO_URI);
    expect(await db.collection("users").countDocuments({ role: "SUPER_ADMIN" })).toBe(1);
    expect(await db.collection("roles").countDocuments({})).toBe(roles.length);
  });
});
