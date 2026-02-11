import { Request, Response } from 'express';
import { cache } from '../dal/cache.dal.js';

export function clearCache(_req: Request, res: Response): void {
  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
}

export function getCacheStatus(_req: Request, res: Response): void {
  res.json(cache.getStats());
}
