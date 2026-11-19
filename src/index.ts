import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';

// Connect first: the session store reuses this connection.
await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });
console.log(`Connected to MongoDB (database: ${config.mongodbDbName})`);

const app = createApp();
app.listen(config.port, () => {
  console.log(`bullet.in API listening on http://localhost:${config.port}`);
});
