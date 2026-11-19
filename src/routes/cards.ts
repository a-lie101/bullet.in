import { Router, type Request } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { HttpError } from '../http-error.js';
import { currentUserId, requireAuth } from '../auth/session.js';
import { COLUMNS, Card, toPublicCard } from '../models/card.js';

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  // JavaScript rolls impossible dates over (Feb 30 -> Mar 2), so check the date survives a round trip.
  .refine((day) => {
    const parsed = new Date(`${day}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
  }, 'Not a real date');

const labels = z.array(z.string().trim().min(1).max(50)).max(20);

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  description: z.string().max(20000).optional(),
  column: z.enum(COLUMNS).optional(),
  dueDate: dateOnly.nullable().optional(),
  labels: labels.optional(),
});

// Column and order change through /move, not here.
const updateSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(300),
    description: z.string().max(20000),
    dueDate: dateOnly.nullable(),
    labels,
  })
  .partial()
  .strict();

const moveSchema = z.object({
  column: z.enum(COLUMNS),
  index: z.number().int().min(0),
});

function toUtcDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

async function findOwnedCard(req: Request) {
  const id = req.params.id;
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    throw new HttpError(404, 'Card not found');
  }
  const card = await Card.findOne({ _id: id, userId: currentUserId(req) });
  if (!card) throw new HttpError(404, 'Card not found');
  return card;
}

async function listCards(userId: string) {
  const cards = await Card.find({ userId }).sort({ column: 1, position: 1 }).lean();
  return cards.map(toPublicCard);
}

cardsRouter.get('/', async (req, res) => {
  res.json({ cards: await listCards(currentUserId(req)) });
});

cardsRouter.post('/', async (req, res) => {
  const input = createSchema.parse(req.body);
  const userId = currentUserId(req);
  const column = input.column ?? 'todo';

  // New cards go to the bottom of their column.
  const last = await Card.findOne({ userId, column }).sort({ position: -1 }).select('position').lean();

  const card = await Card.create({
    userId,
    title: input.title,
    description: input.description ?? '',
    column,
    position: last ? last.position + 1 : 0,
    source: 'manual',
    labels: input.labels ?? [],
    ...(input.dueDate ? { dueDate: toUtcDate(input.dueDate) } : {}),
    ...(column === 'done' ? { completedAt: new Date() } : {}),
  });
  res.status(201).json({ card: toPublicCard(card.toObject()) });
});

cardsRouter.patch('/:id', async (req, res) => {
  const input = updateSchema.parse(req.body);
  const card = await findOwnedCard(req);

  // Imported cards get their title and description from GitHub/AI (later phases).
  if (card.source !== 'manual' && (input.title !== undefined || input.description !== undefined)) {
    throw new HttpError(400, "Imported cards keep their source's title and description");
  }

  if (input.title !== undefined) card.set('title', input.title);
  if (input.description !== undefined) card.set('description', input.description);
  if (input.labels !== undefined) card.set('labels', input.labels);
  if (input.dueDate !== undefined) {
    card.set('dueDate', input.dueDate === null ? undefined : toUtcDate(input.dueDate));
  }

  await card.save();
  res.json({ card: toPublicCard(card.toObject()) });
});

// Move a card to `column`, at `index` among that column's cards (0 = top).
// Responds with every card so the board can resync its order.
cardsRouter.post('/:id/move', async (req, res) => {
  const { column, index } = moveSchema.parse(req.body);
  const card = await findOwnedCard(req);
  const userId = card.userId;

  const others = await Card.find({ userId, column, _id: { $ne: card._id } })
    .sort({ position: 1 })
    .select('_id')
    .lean();
  const orderedIds = others.map((other) => other._id);
  orderedIds.splice(Math.min(index, orderedIds.length), 0, card._id);

  const enteringDone = column === 'done' && card.column !== 'done';
  const leavingDone = column !== 'done' && card.column === 'done';

  const movedCardUpdate = {
    $set: { column, position: orderedIds.indexOf(card._id), ...(enteringDone ? { completedAt: new Date() } : {}) },
    ...(leavingDone ? { $unset: { completedAt: 1 as const } } : {}),
  };

  await Card.bulkWrite(
    orderedIds.map((id, position) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: id.equals(card._id) ? movedCardUpdate : { $set: { position } },
      },
    })),
  );

  res.json({ cards: await listCards(userId.toString()) });
});

cardsRouter.delete('/:id', async (req, res) => {
  const card = await findOwnedCard(req);
  await card.deleteOne();
  res.status(204).end();
});
