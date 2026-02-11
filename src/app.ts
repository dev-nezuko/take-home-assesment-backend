import express, { Express } from 'express';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter.js';
import userRoutes from './routes/user.route.js';
import cacheRoutes from './routes/cache.route.js';

export const app: Express = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(rateLimiter);

app.use('/users', userRoutes);
app.use('/cache', cacheRoutes);

