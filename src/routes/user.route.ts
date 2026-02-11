import { Router } from 'express';
import { getUserById, createUser } from '../controllers/user.controller.js';

const router: Router = Router();

router.get('/:id', getUserById);
router.post('/', createUser);

export default router;
