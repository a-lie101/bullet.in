import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { createSessionMiddleware } from './auth/session.js';
import { errorHandler } from './error-handler.js';
import { authRouter } from './routes/auth.js';
import { cardsRouter } from './routes/cards.js';
import { settingsRouter } from './routes/settings.js';

export function createApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', createSessionMiddleware());
  app.use('/api/auth', authRouter);
  app.use('/api/cards', cardsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // In production the built React app is served from this same server.
  // During development Vite serves it instead and forwards /api here.
  const webDist = fileURLToPath(new URL('../web/dist', import.meta.url));
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET') {
        next();
        return;
      }
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
