import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db, auth } from '../config/firebase';
import { sendResponse } from '../utils/response';
import Joi from 'joi';

const profileSchema = Joi.object({
  name: Joi.string().min(1).max(100).allow('', null),
  profileImage: Joi.string().allow('', null),
  placementGoal: Joi.string().max(500).allow('', null),
  targetDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null), Joi.allow(null)),
  dailyStudyTarget: Joi.number().min(0).max(1440).allow(null),
  phoneUsageLimit: Joi.number().min(0).max(1440).allow(null),
  phoneUsageReal: Joi.number().min(0).max(1440).allow(null),
  onboardingCompleted: Joi.boolean().allow(null),
  lastPhoneSyncDate: Joi.string().allow('', null),
  lastViewedSkillId: Joi.string().allow('', null),
  lastViewedTopicId: Joi.string().allow('', null),
});

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    let userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      const newUser = {
        uid,
        email: req.user?.email || '',
        name: req.user?.name || '',
        profileImage: req.user?.picture || '',
        placementGoal: null,
        targetDate: null,
        dailyStudyTarget: null,
        phoneUsageLimit: null,
        phoneUsageReal: 0,
        onboardingCompleted: false,
        lastPhoneSyncDate: new Date().toISOString(),
        lastViewedSkillId: null,
        lastViewedTopicId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection('users').doc(uid).set(newUser);
      userDoc = await db.collection('users').doc(uid).get();
    }

    sendResponse(res, 200, true, 'Profile fetched successfully', userDoc.data());
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const { error, value } = profileSchema.validate(req.body, { stripUnknown: true });

    if (error) {
      sendResponse(res, 400, false, 'Validation Error', error.details.map(x => x.message));
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      const newUser = {
        uid,
        email: req.user?.email || '',
        name: value.name || req.user?.name || '',
        profileImage: value.profileImage || req.user?.picture || '',
        placementGoal: value.placementGoal || null,
        targetDate: value.targetDate || null,
        dailyStudyTarget: value.dailyStudyTarget ?? null,
        phoneUsageLimit: value.phoneUsageLimit ?? null,
        phoneUsageReal: value.phoneUsageReal ?? 0,
        onboardingCompleted: value.onboardingCompleted ?? false,
        lastPhoneSyncDate: value.lastPhoneSyncDate || new Date().toISOString(),
        lastViewedSkillId: value.lastViewedSkillId || null,
        lastViewedTopicId: value.lastViewedTopicId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection('users').doc(uid).set(newUser);
      const createdDoc = await db.collection('users').doc(uid).get();
      sendResponse(res, 201, true, 'Profile created successfully', createdDoc.data());
      return;
    } else {
      const updates = {
        ...value,
        updatedAt: new Date().toISOString()
      };
      await db.collection('users').doc(uid).set(updates, { merge: true });
      const updatedDoc = await db.collection('users').doc(uid).get();
      sendResponse(res, 200, true, 'Profile updated successfully', updatedDoc.data());
      return;
    }
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    // Delete user from Firestore
    await db.collection('users').doc(uid).delete();

    // Delete user from Firebase Auth
    await auth.deleteUser(uid);

    sendResponse(res, 200, true, 'Account deleted successfully');
  } catch (error) {
    next(error);
  }
};
