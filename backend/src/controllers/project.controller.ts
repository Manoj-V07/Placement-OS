import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { sendResponse } from '../utils/response';
import { gitAnalyzer } from '../services/gitAnalyzer.service';
import { projectVerificationService, ProjectReadinessReport } from '../services/projectVerification.service';
import { extractTextFromBase64Pdf } from '../utils/pdfParser';
import { randomUUID } from 'crypto';

export interface Milestone {
  id: string;
  title: string;
  lifecycleStage: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  tasks: Array<{ id: string; title: string; completed: boolean }>;
}

export const DEFAULT_LIFECYCLE_STAGES = [
  { title: 'Idea & Product Scope', lifecycleStage: 'Idea', description: 'Problem definition, target users, core requirements, and MVP scope.' },
  { title: 'System Architecture Design', lifecycleStage: 'Architecture', description: 'High-level architecture, module boundaries, component diagram, and data flow.' },
  { title: 'Database Schema & Modeling', lifecycleStage: 'Database', description: 'ER diagram, tables/collections, indexes, relations, and migrations.' },
  { title: 'Backend Core & Business Logic', lifecycleStage: 'Backend', description: 'API routes, controllers, services, error middleware, and data validation.' },
  { title: 'Frontend Interface & State', lifecycleStage: 'Frontend', description: 'Responsive UI components, client state management, and API integration.' },
  { title: 'Authentication & Security Guardrails', lifecycleStage: 'Authentication', description: 'Secure auth flow, password hashing, session/JWT validation, and route protection.' },
  { title: 'Automated Testing Suite', lifecycleStage: 'Testing', description: 'Unit tests, API integration tests, and edge-case validation.' },
  { title: 'Docker Containerization', lifecycleStage: 'Docker', description: 'Dockerfile creation, multi-stage builds, and docker-compose orchestration.' },
  { title: 'Cloud Deployment & Live Hosting', lifecycleStage: 'Deployment', description: 'Production hosting, custom domain/SSL, environment variables, and health checks.' },
  { title: 'Engineering Documentation', lifecycleStage: 'Documentation', description: 'Comprehensive README, architecture diagrams, setup steps, and API docs.' },
  { title: 'Resume Readiness & Interview Defense', lifecycleStage: 'Resume Readiness', description: 'Quantified bullet points, technical defense preparation, and code audit pass.' },
];

/**
 * Calculates project progress strictly based on completed milestones
 * (e.g. 6/10 = 60%, 8/10 = 80%). Never manually entered!
 */
export function calculateProgressFromMilestones(milestones: Milestone[] = []): number {
  if (!milestones || milestones.length === 0) return 0;
  const completed = milestones.filter(m => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}

function getUserId(req: AuthRequest): string {
  return req.user?.uid || 'default_user';
}

/**
 * GET /api/v1/projects
 * Get all tracked projects with automatic progress calculation
 */
export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const snap = await db.collection('users').doc(uid).collection('projects').get();
    
    const projects: any[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      const milestones = data.milestones || [];
      const computedProgress = calculateProgressFromMilestones(milestones);

      projects.push({
        id: doc.id,
        ...data,
        progress: computedProgress, // strictly calculated
        completedMilestonesCount: milestones.filter((m: any) => m.completed).length,
        totalMilestonesCount: milestones.length
      });
    });

    // Sort by createdAt desc
    projects.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Also fetch tracker config for target project count
    const configDoc = await db.collection('users').doc(uid).collection('tracker_config').doc('project_tracker').get();
    const trackerConfig = configDoc.exists ? configDoc.data() : { targetProjectCount: 3 };

    sendResponse(res, 200, true, 'Projects retrieved successfully', {
      projects,
      trackerConfig
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/:id
 * Get single project with latest readiness report
 */
export const getProjectById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);

    const projectDoc = await db.collection('users').doc(uid).collection('projects').doc(id).get();
    if (!projectDoc.exists) {
      sendResponse(res, 404, false, 'Project not found');
      return;
    }

    const projectData = projectDoc.data()!;
    const milestones = projectData.milestones || [];
    const computedProgress = calculateProgressFromMilestones(milestones);

    // Get latest analysis if exists
    let latestAnalysis: any = null;
    if (projectData.latestAnalysisId) {
      const analysisDoc = await db.collection('users').doc(uid)
        .collection('projects').doc(id)
        .collection('analyses').doc(projectData.latestAnalysisId).get();
      if (analysisDoc.exists) {
        latestAnalysis = analysisDoc.data();
      }
    }

    sendResponse(res, 200, true, 'Project retrieved successfully', {
      ...projectData,
      id: projectDoc.id,
      progress: computedProgress,
      latestAnalysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/projects
 * Create a new resume showcase project
 */
export const createProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const {
      name,
      description,
      projectStatus = 'fresh', // 'completed' | 'fresh'
      technologies = [],
      features = [],
      githubUrl = '',
      liveUrl = '',
      startDate = '',
      targetDate = '',
      deploymentStatus = 'not_deployed',
      documentationStatus = 'none',
      roadmapBase64Pdf = '',
      roadmapFileName = '',
      roadmapText: directRoadmapText = '',
      milestones: customMilestones
    } = req.body;

    if (!name || !name.trim()) {
      sendResponse(res, 400, false, 'Project name is required');
      return;
    }

    const projectId = randomUUID();
    const isCompleted = projectStatus === 'completed';

    // Parse roadmap PDF if supplied for fresh project
    let parsedRoadmapText = directRoadmapText || '';
    if (!isCompleted && roadmapBase64Pdf) {
      try {
        const extracted = await extractTextFromBase64Pdf(roadmapBase64Pdf);
        if (extracted) parsedRoadmapText = extracted;
      } catch (e) {
        console.warn('PDF roadmap parsing error:', e);
      }
    }

    // Default to the 11 lifecycle stages. If project is completed, mark default milestones as completed!
    const initialMilestones: Milestone[] = (customMilestones && customMilestones.length > 0)
      ? customMilestones.map((m: any) => ({
          id: m.id || randomUUID(),
          title: m.title,
          lifecycleStage: m.lifecycleStage || 'Custom',
          description: m.description || '',
          completed: isCompleted ? true : !!m.completed,
          tasks: m.tasks || []
        }))
      : DEFAULT_LIFECYCLE_STAGES.map(stage => ({
          id: randomUUID(),
          title: stage.title,
          lifecycleStage: stage.lifecycleStage,
          description: stage.description,
          completed: isCompleted ? true : false,
          tasks: [
            { id: randomUUID(), title: `Define specifications for ${stage.lifecycleStage}`, completed: isCompleted },
            { id: randomUUID(), title: `Implement and verify ${stage.lifecycleStage}`, completed: isCompleted }
          ]
        }));

    const progress = calculateProgressFromMilestones(initialMilestones);
    const now = new Date().toISOString();

    const newProject = {
      id: projectId,
      userId: uid,
      name: name.trim(),
      description: description?.trim() || '',
      projectStatus, // 'completed' | 'fresh'
      technologies: Array.isArray(technologies) ? technologies : [],
      features: Array.isArray(features) ? features : [],
      milestones: initialMilestones,
      progress, // strictly calculated! (100% if completed)
      githubUrl: githubUrl.trim(),
      liveUrl: liveUrl.trim(),
      startDate: startDate || now.split('T')[0],
      targetDate: isCompleted ? '' : (targetDate || ''), // Do NOT collect target completion date if completed
      roadmapFileName: isCompleted ? '' : (roadmapFileName || ''),
      roadmapText: isCompleted ? '' : parsedRoadmapText,
      deploymentStatus: isCompleted && deploymentStatus === 'not_deployed' ? 'production' : deploymentStatus,
      documentationStatus,
      resumeReadiness: 'not_ready',
      analysisStatus: 'never_analyzed',
      latestAnalysisId: null,
      latestScores: null,
      majorRisks: [],
      nextActions: isCompleted 
        ? ['Run Project Verification Analysis to receive modernization and interview defense suggestions']
        : ['Track milestones against roadmap and meet project deadline'],
      createdAt: now,
      updatedAt: now
    };

    await db.collection('users').doc(uid).collection('projects').doc(projectId).set(newProject);

    sendResponse(res, 201, true, isCompleted 
      ? 'Completed project registered. Ready for modernization and interview defense analysis.'
      : 'Fresh project registered with roadmap tracking and deadline.', 
      newProject
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/projects/:id
 * Update project metadata, technologies, features, URLs, etc.
 */
export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);

    const projectRef = db.collection('users').doc(uid).collection('projects').doc(id);
    const doc = await projectRef.get();
    if (!doc.exists) {
      sendResponse(res, 404, false, 'Project not found');
      return;
    }

    const currentData = doc.data()!;
    const updatePayload: any = {
      updatedAt: new Date().toISOString()
    };

    const allowedFields = [
      'name', 'description', 'projectStatus', 'technologies', 'features', 'githubUrl',
      'liveUrl', 'startDate', 'targetDate', 'deploymentStatus', 'documentationStatus',
      'roadmapFileName', 'roadmapText'
    ];

    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        updatePayload[f] = req.body[f];
      }
    }

    if (req.body.roadmapBase64Pdf) {
      try {
        const text = await extractTextFromBase64Pdf(req.body.roadmapBase64Pdf);
        if (text) updatePayload.roadmapText = text;
      } catch (e) {
        console.warn('PDF roadmap parsing error:', e);
      }
    }

    if (req.body.milestones) {
      updatePayload.milestones = req.body.milestones;
      updatePayload.progress = calculateProgressFromMilestones(req.body.milestones);
    }

    await projectRef.update(updatePayload);
    const updatedDoc = await projectRef.get();

    sendResponse(res, 200, true, 'Project updated successfully', {
      id,
      ...updatedDoc.data()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/projects/:id
 */
export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);

    await db.collection('users').doc(uid).collection('projects').doc(id).delete();
    sendResponse(res, 200, true, 'Project deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/projects/:id/milestones
 * Update milestone completion and recalculate progress automatically
 */
export const updateMilestones = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);
    const { milestones } = req.body;

    if (!Array.isArray(milestones)) {
      sendResponse(res, 400, false, 'Milestones array is required');
      return;
    }

    const projectRef = db.collection('users').doc(uid).collection('projects').doc(id);
    const doc = await projectRef.get();
    if (!doc.exists) {
      sendResponse(res, 404, false, 'Project not found');
      return;
    }

    // Strictly calculate progress from completed milestones
    const progress = calculateProgressFromMilestones(milestones);
    const now = new Date().toISOString();

    const formattedMilestones = milestones.map((m: any) => ({
      ...m,
      completedAt: m.completed && !m.completedAt ? now : (m.completed ? m.completedAt : undefined)
    }));

    await projectRef.update({
      milestones: formattedMilestones,
      progress,
      updatedAt: now
    });

    sendResponse(res, 200, true, `Milestones updated. Project progress automatically calculated to ${progress}%`, {
      progress,
      completedMilestones: milestones.filter((m: any) => m.completed).length,
      totalMilestones: milestones.length,
      milestones: formattedMilestones
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/projects/:id/analyze
 * Run deep Git, Static Code, Security, and AI Verification Analysis
 */
export const analyzeProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);

    const projectRef = db.collection('users').doc(uid).collection('projects').doc(id);
    const doc = await projectRef.get();
    if (!doc.exists) {
      sendResponse(res, 404, false, 'Project not found');
      return;
    }

    const project = doc.data()!;
    if (!project.githubUrl) {
      sendResponse(res, 400, false, 'A GitHub repository URL is required to run Project Verification Analysis');
      return;
    }

    // Mark status as analyzing
    await projectRef.update({ analysisStatus: 'analyzing' });

    try {
      // 1. Gather empirical evidence from repository (Git log, diffs, dependencies, static rules, live probe)
      const evidence = await gitAnalyzer.analyzeRepository(
        project.githubUrl,
        project.features || [],
        project.liveUrl
      );

      // 2. Synthesize with AI Reasoning Layer (Ollama / Groq / Gemini)
      const report: ProjectReadinessReport = await projectVerificationService.generateReadinessReport(
        {
          id,
          name: project.name,
          description: project.description,
          technologies: project.technologies || [],
          features: project.features || [],
          githubUrl: project.githubUrl,
          liveUrl: project.liveUrl,
          projectStatus: project.projectStatus || 'fresh',
          targetDate: project.targetDate,
          roadmapText: project.roadmapText,
          roadmapFileName: project.roadmapFileName
        },
        evidence
      );

      // 3. Save report to analysis history
      await projectRef.collection('analyses').doc(report.id).set(report);

      // 4. Update project summary record
      const resumeReadiness = report.resumeReadinessVerdict.isResumeReady
        ? 'interview_ready'
        : (report.readinessScores.overall >= 50 ? 'needs_revision' : 'not_ready');

      await projectRef.update({
        analysisStatus: 'completed',
        latestAnalysisId: report.id,
        latestScores: report.readinessScores,
        resumeReadiness,
        majorRisks: report.resumeReadinessVerdict.criticalWeaknesses || [],
        nextActions: report.resumeReadinessVerdict.missingBeforeResumeReady || [],
        updatedAt: new Date().toISOString()
      });

      sendResponse(res, 200, true, 'Project Verification Analysis completed successfully', report);
    } catch (analysisErr: any) {
      await projectRef.update({ analysisStatus: 'failed' });
      console.error('[ProjectController] Analysis failed:', analysisErr);
      sendResponse(res, 500, false, `Analysis failed: ${analysisErr.message || 'Error inspecting repository'}`);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/:id/analyses
 * Retrieve analysis history to compare improvement over time
 */
export const getAnalysisHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);

    const snap = await db.collection('users').doc(uid).collection('projects').doc(id).collection('analyses').get();
    const history: any[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      history.push({
        id: doc.id,
        analyzedAt: data.analyzedAt,
        providerUsed: data.providerUsed,
        readinessScores: data.readinessScores,
        isResumeReady: data.resumeReadinessVerdict?.isResumeReady,
        summaryVerdict: data.resumeReadinessVerdict?.summaryVerdict
      });
    });

    history.sort((a, b) => new Date(b.analyzedAt || 0).getTime() - new Date(a.analyzedAt || 0).getTime());

    sendResponse(res, 200, true, 'Analysis history retrieved successfully', history);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/:id/analyses/:analysisId
 * Retrieve single complete analysis report
 */
export const getAnalysisById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);
    const analysisId = String(req.params.analysisId);

    const doc = await db.collection('users').doc(uid).collection('projects').doc(id).collection('analyses').doc(analysisId).get();
    if (!doc.exists) {
      sendResponse(res, 404, false, 'Analysis report not found');
      return;
    }

    sendResponse(res, 200, true, 'Analysis report retrieved successfully', doc.data());
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/projects/:id/interview/practice
 * Practice answering an interview-grade question and receive AI evaluation
 */
export const practiceInterview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const id = String(req.params.id);
    const { questionId, answer } = req.body;

    if (!questionId || !answer) {
      sendResponse(res, 400, false, 'questionId and answer are required');
      return;
    }

    const projectDoc = await db.collection('users').doc(uid).collection('projects').doc(id).get();
    if (!projectDoc.exists) {
      sendResponse(res, 404, false, 'Project not found');
      return;
    }
    const project = projectDoc.data()!;

    // Find question from latest analysis
    if (!project.latestAnalysisId) {
      sendResponse(res, 400, false, 'Please run Project Verification Analysis before practicing interview questions');
      return;
    }

    const analysisDoc = await db.collection('users').doc(uid).collection('projects').doc(id).collection('analyses').doc(project.latestAnalysisId).get();
    if (!analysisDoc.exists) {
      sendResponse(res, 404, false, 'Analysis report not found');
      return;
    }

    const analysis = analysisDoc.data() as ProjectReadinessReport;
    const question = (analysis.interviewQuestions || []).find(q => q.id === questionId);
    if (!question) {
      sendResponse(res, 404, false, 'Interview question not found in latest analysis');
      return;
    }

    const evaluation = await projectVerificationService.evaluateInterviewAnswer(
      question,
      answer,
      { name: project.name, technologies: project.technologies || [] }
    );

    // Save session
    const sessionId = randomUUID();
    const sessionData = {
      id: sessionId,
      questionId,
      questionText: question.question,
      topic: question.topic,
      userAnswer: answer,
      score: evaluation.score,
      feedback: evaluation.feedback,
      followUpQuestion: evaluation.followUpQuestion,
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).collection('projects').doc(id).collection('interview_sessions').doc(sessionId).set(sessionData);

    sendResponse(res, 200, true, 'Answer evaluated successfully', sessionData);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/projects/config
 * Get tracker target project count and settings
 */
export const getTrackerConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const doc = await db.collection('users').doc(uid).collection('tracker_config').doc('project_tracker').get();
    const config = doc.exists ? doc.data() : { targetProjectCount: 3 };

    sendResponse(res, 200, true, 'Tracker configuration retrieved', config);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/projects/config
 * Update tracker target project count (e.g. tracking 3, 4, or custom projects)
 */
export const updateTrackerConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = getUserId(req);
    const { targetProjectCount } = req.body;

    const count = parseInt(targetProjectCount, 10);
    if (isNaN(count) || count < 1 || count > 10) {
      sendResponse(res, 400, false, 'Target project count must be between 1 and 10');
      return;
    }

    const config = {
      targetProjectCount: count,
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).collection('tracker_config').doc('project_tracker').set(config, { merge: true });

    sendResponse(res, 200, true, `Tracker configuration updated to ${count} target projects`, config);
  } catch (error) {
    next(error);
  }
};
