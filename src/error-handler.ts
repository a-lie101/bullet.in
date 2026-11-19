import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { HttpError } from './http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: error.issues[0]?.message ?? 'Invalid input',
      details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: 'Invalid input',
      details: Object.values(error.errors).map((issue) => ({ field: issue.path, message: issue.message })),
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid ${error.path}` });
    return;
  }

  // Errors from express.json() (malformed JSON, body too large) carry their own 4xx status.
  const status: unknown = error?.status ?? error?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: error.expose ? error.message : 'Bad request' });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
};
