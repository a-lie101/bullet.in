import mongoose, { type InferSchemaType } from 'mongoose';

// Models the AI action-item extractor can use. Haiku is the default while we
// find out whether it's good enough.
export const AI_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const;
export type AiModel = (typeof AI_MODELS)[number];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 100 },
    // select: false keeps the hash out of every query unless asked for explicitly.
    passwordHash: { type: String, required: true, select: false },
    settings: {
      aiModel: { type: String, enum: AI_MODELS, default: 'claude-haiku-5-5' },
    },
  },
  { timestamps: true },
);

export type UserFields = InferSchemaType<typeof userSchema>;
export const User = mongoose.model('User', userSchema);

export function toPublicUser(user: { _id: unknown; email: string; name?: string | null; settings?: { aiModel?: string | null } | null }) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name ?? null,
    settings: { aiModel: user.settings?.aiModel ?? 'claude-haiku-5-5' },
  };
}
