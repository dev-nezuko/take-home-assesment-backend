import express, { Express } from 'express';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter.js';
import userRoutes from './routes/user.route.js';
import cacheRoutes from './routes/cache.route.js';

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(rateLimiter);

app.use('/users', userRoutes);
app.use('/cache', cacheRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
