import { Router, RequestHandler } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getProfile, updateProfile, deleteAccount } from '../../controllers/user.controller';

const router = Router();

// Protected routes
router.use(requireAuth as RequestHandler);
router.get('/me', getProfile as RequestHandler);
router.patch('/me', updateProfile as RequestHandler);
router.delete('/me', deleteAccount as RequestHandler);

export default router;