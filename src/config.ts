import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

const sessionSecret = required('SESSION_SECRET');
if (sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32');
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  // Production: one server serves the app and the API on PORT.
  // Development: the API runs on API_PORT behind Vite's dev server, which forwards /api to it.
  port: Number((isProduction ? process.env.PORT : process.env.API_PORT) ?? 3000),
  mongodbUri: required('MONGODB_URI'),
  // Used instead of any database name in MONGODB_URI.
  mongodbDbName: process.env.MONGODB_DB_NAME || 'bullet-in',
  sessionSecret,
  isProduction,
  // Self-hosted instances only allow the first account by default.
  // Set ALLOW_REGISTRATION=true to let more people sign up.
  allowRegistration: process.env.ALLOW_REGISTRATION === 'true',
  // Set when running behind a reverse proxy (nginx, Caddy, etc.) so secure cookies work.
  trustProxy: process.env.TRUST_PROXY === 'true',
};
