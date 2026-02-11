import express, { Express, NextFunction, Request, RequestHandler, Response } from 'express';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter.js';
import userRoutes from './routes/user.route.js';
import cacheRoutes from './routes/cache.route.js';

export function createApp(limiter: RequestHandler = rateLimiter): Express {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(limiter);

  app.use('/users', userRoutes);
  app.use('/cache', cacheRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', message: `No route for ${req.method} ${req.path}` });
  });

  // Body-parser errors carry a 4xx `status`; anything else is a bug and must not leak a stack trace.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ error: 'Bad request', message: (err as Error).message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export const app = createApp();
