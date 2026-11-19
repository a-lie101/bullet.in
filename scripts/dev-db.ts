// Runs a local MongoDB for development, for when you don't have one installed.
// Data is kept in .data/mongo between runs. The first run downloads the
// official MongoDB binary (~100 MB) into ~/.cache/mongodb-binaries.
//
//   npm run db:dev
//   then set MONGODB_URI=mongodb://127.0.0.1:27017 in .env
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

const port = Number(process.env.DEV_DB_PORT ?? 27017);
const dbPath = fileURLToPath(new URL('../.data/mongo', import.meta.url));
mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port, dbPath, storageEngine: 'wiredTiger' },
});

console.log(`Local MongoDB running at mongodb://127.0.0.1:${port} (data in .data/mongo)`);
console.log('Press Ctrl+C to stop.');

async function stop() {
  await server.stop({ doCleanup: false });
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
