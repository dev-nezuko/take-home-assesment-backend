import { Router } from 'express';
import { clearCache, getCacheStatus } from '../controllers/cache.controller.js';

const router = Router();

router.delete('/', clearCache);
router.get('/status', getCacheStatus);

export default router;
