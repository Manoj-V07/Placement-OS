import { Router, RequestHandler } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { 
  createSkill, 
  createTopic, 
  recordStudy, 
  getSkillsAndTopics, 
  getSkillsAnalytics,
  getSkillById,
  bulkCreateTopics,
  generateTopicsAI,
  getTopicQuiz,
  evaluateTopicQuiz,
  recordTopicView
} from '../../controllers/skill.controller';

const router = Router();

// Protect all skill routes
router.use(requireAuth as RequestHandler);

// GET /api/v1/skills - Get all skills and topics
router.get('/', getSkillsAndTopics as RequestHandler);

// GET /api/v1/skills/analytics - Get weak topics and reviews
router.get('/analytics', getSkillsAnalytics as RequestHandler);

// POST /api/v1/skills/generate-topics - AI generated topics for a skill
router.post('/generate-topics', generateTopicsAI as RequestHandler);

// POST /api/v1/skills/recent-view - Record recently viewed skill/topic
router.post('/recent-view', recordTopicView as RequestHandler);

// GET /api/v1/skills/:skillId - Get single skill with its ordered topics
router.get('/:skillId', getSkillById as RequestHandler);

// POST /api/v1/skills - Create a new skill category
router.post('/', createSkill as RequestHandler);

// POST /api/v1/skills/:skillId/topics/bulk - Bulk create topics for a skill
router.post('/:skillId/topics/bulk', bulkCreateTopics as RequestHandler);

// POST /api/v1/skills/topics - Create a single topic under a skill
router.post('/topics', createTopic as RequestHandler);

// POST /api/v1/skills/topics/bulk - Alternative bulk endpoint
router.post('/topics/bulk', bulkCreateTopics as RequestHandler);

// GET /api/v1/skills/topics/:topicId/quiz - Get AI test questions for a topic
router.get('/topics/:topicId/quiz', getTopicQuiz as RequestHandler);

// POST /api/v1/skills/topics/:topicId/evaluate - Evaluate chat answers with AI and score mastery
router.post('/topics/:topicId/evaluate', evaluateTopicQuiz as RequestHandler);

// POST /api/v1/skills/topics/:topicId/study - Record study activity
router.post('/topics/:topicId/study', recordStudy as RequestHandler);

export default router;
