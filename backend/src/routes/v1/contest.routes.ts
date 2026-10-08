import { Router } from 'express';
import { getContests, createContest, updateContest, deleteContest, addMistake } from '../../controllers/contest.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getContests);
router.post('/', createContest);
router.put('/:id', updateContest);
router.delete('/:id', deleteContest);
router.post('/:id/mistakes', addMistake);

export default router;
