import mongoose, { type InferSchemaType } from 'mongoose';

export const COLUMNS = ['todo', 'in_progress', 'blocked', 'done'] as const;
export type Column = (typeof COLUMNS)[number];

// Where a card came from. Only 'manual' exists in Phase 1; GitHub import and
// AI suggestions arrive in later phases.
export const CARD_SOURCES = ['manual', 'github', 'ai'] as const;

const cardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: '', maxlength: 20000 },
    column: { type: String, enum: COLUMNS, default: 'todo', required: true },
    // Order within the column, lowest first. Gaps are fine.
    position: { type: Number, required: true, default: 0 },
    source: { type: String, enum: CARD_SOURCES, default: 'manual', required: true },
    // ID and link of the original item for imported cards (e.g. a GitHub issue).
    externalId: { type: String },
    externalUrl: { type: String },
    labels: { type: [String], default: [] },
    // Stored as midnight UTC; only the date part matters.
    dueDate: { type: Date },
    // Set when the card enters Done, cleared when it leaves.
    completedAt: { type: Date },
  },
  { timestamps: true },
);

cardSchema.index({ userId: 1, column: 1, position: 1 });
// One card per imported item per user.
cardSchema.index(
  { userId: 1, source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } },
);

export type CardFields = InferSchemaType<typeof cardSchema>;
export const Card = mongoose.model('Card', cardSchema);

export function toPublicCard(card: CardFields & { _id: unknown }) {
  return {
    id: String(card._id),
    title: card.title,
    description: card.description ?? '',
    column: card.column,
    position: card.position,
    source: card.source,
    externalUrl: card.externalUrl ?? null,
    labels: card.labels ?? [],
    dueDate: card.dueDate ? card.dueDate.toISOString().slice(0, 10) : null,
    completedAt: card.completedAt ? card.completedAt.toISOString() : null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}
