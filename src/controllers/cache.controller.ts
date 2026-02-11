import { Response } from 'express';
import { cache } from '../dal/cache.dal.js';

export function clearCache(_req: unknown, res: Response): void {
  try {
    cache.clear();
    res.json({
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while clearing the cache',
    });
  }
}

export function getCacheStatus(_req: unknown, res: Response): void {
  try {
    const stats = cache.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching cache status',
    });
  }
}
