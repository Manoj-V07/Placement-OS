import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getCPStats, connectProfiles, syncCPStats, getComparison } from '../../controllers/cp.controller';

const router = Router();

router.use(requireAuth);

router.get('/stats', getCPStats);
router.post('/connect', connectProfiles);
router.post('/sync', syncCPStats);
router.get('/comparison', getComparison);

export default router;
