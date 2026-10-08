import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { sendResponse } from '../utils/response';
import Joi from 'joi';
import { randomUUID } from 'crypto';

const contestSchema = Joi.object({
  platform: Joi.string().valid('LeetCode', 'CodeChef', 'Codeforces', 'Other').required(),
  contestDate: Joi.string().required(),
  contestUrl: Joi.string().uri().allow('').optional(),
  attended: Joi.boolean().default(true),
  problemsAttempted: Joi.number().min(0).default(0),
  problemsSolved: Joi.number().min(0).default(0),
  rank: Joi.number().min(1).allow(null).optional(),
  ratingBefore: Joi.number().allow(null).optional(),
  ratingAfter: Joi.number().allow(null).optional(),
  notes: Joi.string().allow('').optional(),
});

const mistakeSchema = Joi.object({
  problemName: Joi.string().required(),
  topic: Joi.string().required(),
  description: Joi.string().allow('').optional(),
});

export const getContests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestsSnapshot = await db.collection('users').doc(uid!).collection('contests').orderBy('contestDate', 'desc').get();
    
    const contests = contestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    sendResponse(res, 200, true, 'Contests fetched successfully', contests);
  } catch (error) {
    next(error);
  }
};

export const createContest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error, value } = contestSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, error.details[0].message);
      return;
    }

    const uid = req.user?.uid;
    const newContest = {
      ...value,
      mistakes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('users').doc(uid!).collection('contests').add(newContest);
    
    sendResponse(res, 201, true, 'Contest recorded successfully', { id: docRef.id, ...newContest });
  } catch (error) {
    next(error);
  }
};

export const updateContest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { error, value } = contestSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, error.details[0].message);
      return;
    }

    const uid = req.user?.uid;
    const docRef = db.collection('users').doc(uid!).collection('contests').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const updatedContest = {
      ...value,
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updatedContest);
    
    sendResponse(res, 200, true, 'Contest updated successfully', { id, ...doc.data(), ...updatedContest });
  } catch (error) {
    next(error);
  }
};

export const deleteContest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const uid = req.user?.uid;
    const docRef = db.collection('users').doc(uid!).collection('contests').doc(id);
    
    const doc = await docRef.get();
    if (!doc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    await docRef.delete();
    
    sendResponse(res, 200, true, 'Contest deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const addMistake = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { error, value } = mistakeSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, error.details[0].message);
      return;
    }

    const uid = req.user?.uid;
    const docRef = db.collection('users').doc(uid!).collection('contests').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const mistakeId = randomUUID();
    const newMistake = {
      id: mistakeId,
      ...value,
      createdAt: new Date().toISOString()
    };

    const contestData = doc.data() as any;
    const mistakes = contestData.mistakes || [];
    mistakes.push(newMistake);

    await docRef.update({
      mistakes,
      updatedAt: new Date().toISOString()
    });

    // Automatically create a revision task for this mistake
    const today = new Date();
    // Schedule for tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskDate = tomorrow.toISOString().split('T')[0];
    
    const newTask = {
      title: `Revise ${value.topic}: ${value.problemName}`,
      category: 'Revision',
      priority: 'High',
      estimatedDuration: 45,
      date: taskDate,
      status: 'pending',
      notes: `From contest mistake: ${value.description}`,
      isAutoGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid!).collection('tasks').add(newTask);

    sendResponse(res, 201, true, 'Mistake recorded and revision task created', { mistake: newMistake, task: newTask });
  } catch (error) {
    next(error);
  }
};
