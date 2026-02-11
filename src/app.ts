import express, {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter.js';
import userRoutes from './routes/user.route.js';
import cacheRoutes from './routes/cache.route.js';

// TRUST_PROXY: unset/"false" ignores X-Forwarded-For; a hop count ("1") or an address list
// ("loopback", "10.0.0.0/8") trusts only those proxies. Never "true" on a directly exposed port.
export function parseTrustProxy(
  value: string | undefined
): boolean | number | string {
  if (!value || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

interface AppOptions {
  limiter?: RequestHandler;
  trustProxy?: boolean | number | string;
}

export function createApp({
  limiter = rateLimiter,
  trustProxy = parseTrustProxy(process.env.TRUST_PROXY),
}: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      exposedHeaders: [
        'X-Cache',
        'RateLimit-Policy',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'Retry-After',
      ],
    })
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: true, limit: '16kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(limiter);

  app.use('/users', userRoutes);
  app.use('/cache', cacheRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      message: `No route for ${req.method} ${req.path}`,
    });
  });

  // Body-parser errors carry a 4xx `status`; anything else is a bug and must not leak a stack trace.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res
        .status(status)
        .json({ error: 'Bad request', message: (err as Error).message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export const app = createApp();
