import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  generateDailyTasks,
  getTaskAnalytics,
  getDailyHeatmap
} from '../../controllers/tasks.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getTasks);
router.post('/', createTask);
router.post('/generate', generateDailyTasks);
router.get('/analytics/weekly', getTaskAnalytics);
router.get('/analytics/heatmap', getDailyHeatmap);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

export default router;
