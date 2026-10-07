import { Router } from 'express';
import healthRoutes from './health';
import userRoutes from './user.routes';
import skillRoutes from './skill.routes';
import dsaRoutes from './dsa.routes';
import tasksRoutes from './tasks.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/skills', skillRoutes);
router.use('/dsa', dsaRoutes);
router.use('/tasks', tasksRoutes);

export default router;