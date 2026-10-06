import { Router } from 'express';
import healthRoutes from './health';
import userRoutes from './user.routes';
import skillRoutes from './skill.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/skills', skillRoutes);

export default router;