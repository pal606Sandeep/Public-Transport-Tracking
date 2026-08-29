/**
 * Baseline schema: create foundational collections and the indexes they need.
 * Seed data (roles, permissions, admin user, system settings) is inserted by
 * scripts/seed.ts so that it is idempotent and re-runnable.
 *
 * @param db {import('mongodb').Db}
 * @param client {import('mongodb').MongoClient}
 * @returns {Promise<void>}
 */
export const up = async (db, _client) => {
  // roles: unique code + strict structure
  const roles = db.collection('roles');
  await roles.createIndex({ code: 1 }, { unique: true });
  await roles.createIndex({ name: 1 }, { unique: true });

  // permissions: unique code
  const permissions = db.collection('permissions');
  await permissions.createIndex({ code: 1 }, { unique: true });

  // users: unique email, index on role/isActive
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ role: 1 });
  await users.createIndex({ isActive: 1 });

  // systemSettings: singleton document guard
  const systemSettings = db.collection('systemsettings');
  await systemSettings.createIndex({ key: 1 }, { unique: true });
};

export const down = async (db, _client) => {
  await db.collection('roles').dropIndexes();
  await db.collection('permissions').dropIndexes();
  await db.collection('users').dropIndexes();
  await db.collection('systemsettings').dropIndexes();
};
