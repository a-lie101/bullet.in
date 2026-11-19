import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../http-error.js';
import { currentUserId, requireAuth } from '../auth/session.js';
import { AI_MODELS, User, toPublicUser } from '../models/user.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const settingsSchema = z.object({ aiModel: z.enum(AI_MODELS) }).partial().strict();

settingsRouter.patch('/', async (req, res) => {
  const input = settingsSchema.parse(req.body);
  const user = await User.findById(currentUserId(req));
  if (!user) throw new HttpError(401, 'Not signed in');

  if (input.aiModel) user.set('settings.aiModel', input.aiModel);
  await user.save();
  res.json({ user: toPublicUser(user) });
});
