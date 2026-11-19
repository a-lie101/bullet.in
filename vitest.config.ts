import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // The first run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 180_000,
    testTimeout: 30_000,
    env: {
      // Tests connect to an in-memory MongoDB; these only satisfy config.ts.
      MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
      SESSION_SECRET: 'test-secret-test-secret-test-secret-123',
      ALLOW_REGISTRATION: 'false',
    },
  },
});
