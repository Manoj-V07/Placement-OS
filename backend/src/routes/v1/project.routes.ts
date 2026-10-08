import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateMilestones,
  analyzeProject,
  getAnalysisHistory,
  getAnalysisById,
  practiceInterview,
  getTrackerConfig,
  updateTrackerConfig
} from '../../controllers/project.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

// Protect all project routes
router.use(requireAuth);

// Tracker configuration routes
router.get('/config', getTrackerConfig);
router.put('/config', updateTrackerConfig);

// Project collection routes
router.get('/', getProjects);
router.post('/', createProject);

// Single project routes
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Milestones & progress calculation route
router.patch('/:id/milestones', updateMilestones);

// Verification & Analysis routes
router.post('/:id/analyze', analyzeProject);
router.get('/:id/analyses', getAnalysisHistory);
router.get('/:id/analyses/:analysisId', getAnalysisById);

// Interview Showcase Practice route
router.post('/:id/interview/practice', practiceInterview);

export default router;
