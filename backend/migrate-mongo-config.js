// migrate-mongo configuration (ESM).
// Loads MONGO_URI from the environment (.env is loaded via dotenv).
import 'dotenv/config';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/transport_tracking';

// Split "mongodb://host:port/dbname[?opts]" into url + databaseName so that
// migrate-mongo can connect. If the URI has a query string for the replica
// set, we must keep it on the url and only strip the database name segment.
const dbNameMatch = mongoUri.match(/^(.+?)\/([^/?]+)(\?.*)?$/);
const url = dbNameMatch ? dbNameMatch[1] + (dbNameMatch[3] || '') : mongoUri;
const databaseName = dbNameMatch ? dbNameMatch[2] : 'transport_tracking';

const config = {
  mongodb: {
    url,
    databaseName,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'esm',
};

export default config;
