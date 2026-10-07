import { Router } from 'express';
import { getProblems, recordAttempt, resetAttempt, resetAllAttempts, getAnalytics } from '../../controllers/dsa.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/problems', getProblems);
router.delete('/problems/reset-all', resetAllAttempts);
router.delete('/attempts/reset-all', resetAllAttempts);
router.post('/problems/:problemId/attempt', recordAttempt);
router.delete('/problems/:problemId/attempt', resetAttempt);
router.get('/analytics', getAnalytics);

export default router;
