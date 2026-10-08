import { Router } from 'express';
import { getContests, createContest, updateContest, deleteContest, addMistake } from '../../controllers/contest.controller';
import { 
  generateAIContest, 
  getAIContests, 
  getAIContestById, 
  startAIContest, 
  runAICode, 
  submitAIProblem, 
  finishAIContest,
  recordMalpractice,
  advanceProblem
} from '../../controllers/aiContest.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

// AI Contest Arena Routes (Phase 5)
router.post('/ai/generate', generateAIContest);
router.get('/ai', getAIContests);
router.get('/ai/:id', getAIContestById);
router.post('/ai/:id/start', startAIContest);
router.post('/ai/run-code', runAICode);
router.post('/ai/:id/submit', submitAIProblem);
router.post('/ai/:id/finish', finishAIContest);
router.post('/ai/:id/malpractice', recordMalpractice);
router.post('/ai/:id/advance', advanceProblem);

// Legacy Contest Routes
router.get('/', getContests);
router.post('/', createContest);
router.put('/:id', updateContest);
router.delete('/:id', deleteContest);
router.post('/:id/mistakes', addMistake);

export default router;
