import type { Request, RequestHandler } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { HttpError } from '../http-error.js';

// Tell TypeScript what we keep in the session.
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export const SESSION_COOKIE = 'bullet.sid';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Call after mongoose has connected: sessions are stored in the same database.
export function createSessionMiddleware(): RequestHandler {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      // Same database mongoose is using (the client's default could be another one).
      dbName: mongoose.connection.name,
      collectionName: 'sessions',
      ttl: THIRTY_DAYS_MS / 1000,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // 'auto' marks the cookie secure whenever the request came over HTTPS,
      // so self-hosting over plain HTTP on a home network still works.
      secure: 'auto',
      maxAge: THIRTY_DAYS_MS,
    },
  });
}

// Issue a fresh session ID on login so an old ID can't be reused (session fixation).
export function signIn(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      req.session.userId = userId;
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) {
    throw new HttpError(401, 'Not signed in');
  }
  next();
};

// Only call inside routes that use requireAuth.
export function currentUserId(req: Request): string {
  const userId = req.session.userId;
  if (!userId) throw new HttpError(401, 'Not signed in');
  return userId;
}
