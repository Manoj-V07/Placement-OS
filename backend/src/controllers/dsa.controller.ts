import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { sendResponse } from '../utils/response';
import Joi from 'joi';

const dsaAttemptSchema = Joi.object({
  solved: Joi.boolean().required(),
  timeTaken: Joi.number().min(0).optional(),
  understandingLevel: Joi.number().min(1).max(5).required(),
  hintUsed: Joi.boolean().optional(),
  editorialUsed: Joi.boolean().optional(),
  failureReason: Joi.string().allow('').optional(),
  code: Joi.string().allow('').optional(),
  approach: Joi.string().allow('').optional(),
  mediaUrl: Joi.string().allow('').optional(),
});

// GET /api/v1/dsa/problems
export const getProblems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const problemsSnapshot = await db.collection('dsa_problems').get();
    const userAttemptsSnapshot = await db.collection('users').doc(uid!).collection('dsa_attempts').get();

    const attemptsMap: Record<string, any> = {};
    userAttemptsSnapshot.forEach(doc => {
      attemptsMap[doc.id] = doc.data();
    });

    const problems = problemsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        userAttempt: attemptsMap[doc.id] || null
      };
    });

    sendResponse(res, 200, true, 'DSA problems fetched successfully', problems);
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/dsa/problems/:problemId/attempt
export const recordAttempt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const problemId = req.params.problemId as string;
    const { error, value } = dsaAttemptSchema.validate(req.body);

    if (error) {
      sendResponse(res, 400, false, 'Validation Error', error.details.map(x => x.message));
      return;
    }

    const attemptRef = db.collection('users').doc(uid!).collection('dsa_attempts').doc(problemId);
    const attemptDoc = await attemptRef.get();

    let attemptCount = 1;
    let revisionCount = 0;
    
    if (attemptDoc.exists) {
      const existing = attemptDoc.data()!;
      attemptCount = (existing.attemptCount || 0) + 1;
      if (existing.solved) {
        revisionCount = (existing.revisionCount || 0) + 1;
      }
    }

    // Revision engine: calculate next review date
    let nextReviewDays = 1;
    if (value.solved) {
      if (value.understandingLevel === 5) nextReviewDays = 14;
      else if (value.understandingLevel === 4) nextReviewDays = 7;
      else if (value.understandingLevel === 3) nextReviewDays = 3;
      else nextReviewDays = 1;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewDays);

    const newAttemptData = {
      ...value,
      attemptCount,
      revisionCount,
      revisitStatus: value.understandingLevel < 4 || !value.solved,
      nextRevisionDate: nextReviewDate.toISOString(),
      lastAttemptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await attemptRef.set(newAttemptData, { merge: true });

    sendResponse(res, 200, true, 'Attempt recorded successfully', newAttemptData);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/dsa/problems/:problemId/attempt
export const resetAttempt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const problemId = req.params.problemId as string;
    
    const attemptRef = db.collection('users').doc(uid!).collection('dsa_attempts').doc(problemId);
    await attemptRef.delete();
    
    sendResponse(res, 200, true, 'Attempt reset successfully');
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/dsa/problems/reset-all
export const resetAllAttempts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const attemptsSnapshot = await db.collection('users').doc(uid!).collection('dsa_attempts').get();
    
    if (!attemptsSnapshot.empty) {
      const docs = attemptsSnapshot.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = db.batch();
        const chunk = docs.slice(i, i + 400);
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }
    
    sendResponse(res, 200, true, 'All attempts and solved counts reset successfully');
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/dsa/analytics
export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const attemptsSnapshot = await db.collection('users').doc(uid!).collection('dsa_attempts').get();
    
    let totalSolved = 0;
    let dueForRevision = 0;
    const now = new Date();

    attemptsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.solved) totalSolved++;
      if (data.nextRevisionDate && new Date(data.nextRevisionDate) <= now) {
        dueForRevision++;
      }
    });

    sendResponse(res, 200, true, 'DSA Analytics', {
      totalSolved,
      dueForRevision,
      totalAttempted: attemptsSnapshot.size
    });
  } catch (error) {
    next(error);
  }
};
