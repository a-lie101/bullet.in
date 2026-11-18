import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../http-error.js';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../auth/password.js';
import { SESSION_COOKIE, currentUserId, requireAuth, signIn } from '../auth/session.js';
import { User, toPublicUser } from '../models/user.js';

export const authRouter = Router();

// Slow down password guessing: 20 failed attempts per 15 minutes per IP.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  name: z.string().trim().max(100).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});

async function needsSetup(): Promise<boolean> {
  return (await User.exists({})) === null;
}

async function registrationOpen(): Promise<boolean> {
  // The first account can always be created.
  return config.allowRegistration || (await needsSetup());
}

authRouter.get('/status', async (_req, res) => {
  res.json({ registrationOpen: await registrationOpen(), needsSetup: await needsSetup() });
});

authRouter.post('/register', credentialsLimiter, async (req, res) => {
  if (!(await registrationOpen())) {
    throw new HttpError(403, 'Registration is closed on this server');
  }
  const { email, password, name } = registerSchema.parse(req.body);
  if (await User.exists({ email })) {
    throw new HttpError(409, 'An account with that email already exists');
  }

  const user = await User.create({
    email,
    passwordHash: await hashPassword(password),
    ...(name ? { name } : {}),
  });
  await signIn(req, user._id.toString());
  res.status(201).json({ user: toPublicUser(user) });
});

authRouter.post('/login', credentialsLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    await burnPasswordCheck(password);
    throw new HttpError(401, 'Wrong email or password');
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'Wrong email or password');
  }

  await signIn(req, user._id.toString());
  res.json({ user: toPublicUser(user) });
});

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      next(error);
      return;
    }
    res.clearCookie(SESSION_COOKIE);
    res.status(204).end();
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(currentUserId(req));
  if (!user) {
    // The account was deleted while the session was still alive.
    req.session.destroy(() => {});
    throw new HttpError(401, 'Not signed in');
  }
  res.json({ user: toPublicUser(user) });
});
