import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { sendResponse } from '../utils/response';
import { fetchLeetCodeStats, LeetCodeStats } from '../utils/leetcode';
import { fetchCodeChefStats, CodeChefStats } from '../utils/codechef';
import Joi from 'joi';

const connectSchema = Joi.object({
  leetcodeUsername: Joi.string().trim().allow('', null).optional(),
  codechefUsername: Joi.string().trim().allow('', null).optional(),
});

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache for auto-sync

export const getCPStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const leetcodeUsername = (userData.leetcodeUsername || '').trim();
    const codechefUsername = (userData.codechefUsername || '').trim();

    // Check cache
    const cacheDoc = await db.collection('users').doc(uid).collection('cp_data').doc('latest').get();
    let cachedData = cacheDoc.exists ? cacheDoc.data() : null;

    const now = Date.now();
    const lastSynced = cachedData?.lastSyncedAt ? new Date(cachedData.lastSyncedAt).getTime() : 0;
    const isCacheStale = now - lastSynced > CACHE_TTL_MS;

    const hasUsernames = Boolean(leetcodeUsername || codechefUsername);

    // If cache is stale or missing, and we have usernames connected, auto-sync!
    if (hasUsernames && (isCacheStale || !cachedData)) {
      let leetcodeStats: LeetCodeStats | null = null;
      let codechefStats: CodeChefStats | null = null;

      if (leetcodeUsername) {
        leetcodeStats = await fetchLeetCodeStats(leetcodeUsername);
      }
      if (codechefUsername) {
        codechefStats = await fetchCodeChefStats(codechefUsername);
      }

      cachedData = {
        connected: {
          leetcode: leetcodeUsername || null,
          codechef: codechefUsername || null
        },
        leetcode: leetcodeStats,
        codechef: codechefStats,
        lastSyncedAt: new Date().toISOString()
      };

      await db.collection('users').doc(uid).collection('cp_data').doc('latest').set(cachedData);
    }

    sendResponse(res, 200, true, 'Competitive programming stats fetched', {
      connected: {
        leetcode: leetcodeUsername || null,
        codechef: codechefUsername || null
      },
      leetcode: cachedData?.leetcode || null,
      codechef: cachedData?.codechef || null,
      lastSyncedAt: cachedData?.lastSyncedAt || null
    });
  } catch (error) {
    next(error);
  }
};

export const connectProfiles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const { error, value } = connectSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, error.details[0].message);
      return;
    }

    const leetcodeUsername = (value.leetcodeUsername || '').trim();
    const codechefUsername = (value.codechefUsername || '').trim();

    // Update user profile in Firestore
    await db.collection('users').doc(uid).set({
      leetcodeUsername: leetcodeUsername || null,
      codechefUsername: codechefUsername || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Immediately trigger synchronization for the newly connected profiles
    let leetcodeStats: LeetCodeStats | null = null;
    let codechefStats: CodeChefStats | null = null;

    if (leetcodeUsername) {
      leetcodeStats = await fetchLeetCodeStats(leetcodeUsername);
    }
    if (codechefUsername) {
      codechefStats = await fetchCodeChefStats(codechefUsername);
    }

    const cpData = {
      connected: {
        leetcode: leetcodeUsername || null,
        codechef: codechefUsername || null
      },
      leetcode: leetcodeStats,
      codechef: codechefStats,
      lastSyncedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).collection('cp_data').doc('latest').set(cpData);

    sendResponse(res, 200, true, 'Profiles connected and synchronized successfully', cpData);
  } catch (error) {
    next(error);
  }
};

export const syncCPStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const leetcodeUsername = (userData.leetcodeUsername || '').trim();
    const codechefUsername = (userData.codechefUsername || '').trim();

    if (!leetcodeUsername && !codechefUsername) {
      sendResponse(res, 400, false, 'No competitive programming profiles connected yet. Please connect your username first.');
      return;
    }

    let leetcodeStats: LeetCodeStats | null = null;
    let codechefStats: CodeChefStats | null = null;

    if (leetcodeUsername) {
      leetcodeStats = await fetchLeetCodeStats(leetcodeUsername);
    }
    if (codechefUsername) {
      codechefStats = await fetchCodeChefStats(codechefUsername);
    }

    const cpData = {
      connected: {
        leetcode: leetcodeUsername || null,
        codechef: codechefUsername || null
      },
      leetcode: leetcodeStats,
      codechef: codechefStats,
      lastSyncedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).collection('cp_data').doc('latest').set(cpData);

    sendResponse(res, 200, true, 'Competitive programming stats synchronized successfully', cpData);
  } catch (error) {
    next(error);
  }
};

export const getComparison = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    // 1. Fetch manual DSA Progress
    const dsaAttemptsSnap = await db.collection('users').doc(uid).collection('dsa_attempts').get();
    let dsaSolvedCount = 0;
    let dsaAttemptedCount = dsaAttemptsSnap.size;
    const dsaAttemptsByDifficulty: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };

    // Get problems metadata to count difficulty
    const problemsSnap = await db.collection('dsa_problems').get();
    const problemDifficultyMap: Record<string, string> = {};
    problemsSnap.forEach(doc => {
      const p = doc.data();
      if (p.difficulty) problemDifficultyMap[doc.id] = p.difficulty;
    });

    dsaAttemptsSnap.forEach(doc => {
      const data = doc.data();
      if (data.solved) {
        dsaSolvedCount++;
        const diff = problemDifficultyMap[doc.id] || 'Medium';
        if (dsaAttemptsByDifficulty[diff] !== undefined) {
          dsaAttemptsByDifficulty[diff]++;
        }
      }
    });

    // 2. Fetch Tasks (Planned progress metrics)
    const tasksSnap = await db.collection('users').doc(uid).collection('tasks').get();
    let totalTasks = tasksSnap.size;
    let completedTasks = 0;
    tasksSnap.forEach(doc => {
      if (doc.data().status === 'completed') completedTasks++;
    });

    // 3. Fetch Manual Contests
    const manualContestsSnap = await db.collection('users').doc(uid).collection('contests').get();
    let manualContestsCount = manualContestsSnap.size;
    let totalMistakesLogged = 0;
    manualContestsSnap.forEach(doc => {
      const c = doc.data();
      if (Array.isArray(c.mistakes)) {
        totalMistakesLogged += c.mistakes.length;
      }
    });

    // 4. Fetch CP latest cache
    const cacheDoc = await db.collection('users').doc(uid).collection('cp_data').doc('latest').get();
    const cpData = cacheDoc.exists ? cacheDoc.data() : null;

    const leetcode = cpData?.leetcode;
    const codechef = cpData?.codechef;

    const leetcodeSolved = leetcode?.available ? leetcode.totalSolved : 0;
    const codechefSolved = codechef?.available ? codechef.totalSolved : 0;
    const totalCPSolved = leetcodeSolved + codechefSolved;

    const totalContestsParticipated = (leetcode?.contestsParticipated || 0) + (codechef?.contestsParticipated || 0);

    const comparison = {
      plannedDSA: {
        problemsSolved: dsaSolvedCount,
        problemsAttempted: dsaAttemptedCount,
        totalTasksPlanned: totalTasks,
        tasksCompleted: completedTasks,
        manualContestsLogged: manualContestsCount,
        mistakesLogged: totalMistakesLogged,
        byDifficulty: dsaAttemptsByDifficulty
      },
      actualCP: {
        totalCPSolved,
        leetcode: {
          available: leetcode?.available || false,
          username: leetcode?.username || null,
          solved: leetcodeSolved,
          easy: leetcode?.easySolved || 0,
          medium: leetcode?.mediumSolved || 0,
          hard: leetcode?.hardSolved || 0,
          rating: leetcode?.contestRating || null,
          contests: leetcode?.contestsParticipated || 0
        },
        codechef: {
          available: codechef?.available || false,
          username: codechef?.username || null,
          solved: codechefSolved,
          stars: codechef?.stars || 0,
          rating: codechef?.rating || null,
          highestRating: codechef?.highestRating || null,
          contests: codechef?.contestsParticipated || 0
        },
        totalContestsParticipated,
        lastSyncedAt: cpData?.lastSyncedAt || null
      },
      insights: {
        solvedComparisonRatio: dsaSolvedCount > 0 ? Number((totalCPSolved / dsaSolvedCount).toFixed(2)) : null,
        practiceConsistency: completedTasks > 0 ? Math.round((completedTasks / (totalTasks || 1)) * 100) : 0,
        summary: totalCPSolved > 0
          ? `You have tracked ${dsaSolvedCount} problems in your DSA roadmap and solved ${totalCPSolved} problems across competitive platforms.`
          : 'Connect your LeetCode and CodeChef handles to compare your planned DSA roadmap with live competitive programming performance.'
      }
    };

    sendResponse(res, 200, true, 'Comparison data fetched successfully', comparison);
  } catch (error) {
    next(error);
  }
};
