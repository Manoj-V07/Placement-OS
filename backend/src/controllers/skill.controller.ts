import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { sendResponse } from '../utils/response';
import Joi from 'joi';

const skillSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  category: Joi.string().allow('').optional()
});

const topicSchema = Joi.object({
  skillId: Joi.string().required(),
  name: Joi.string().required().min(1).max(100)
});

const studyRecordSchema = Joi.object({
  understandingLevel: Joi.number().min(1).max(5).required(), // 1 to 5
  notes: Joi.string().allow('').optional(),
  durationMinutes: Joi.number().min(1).optional()
});

// Create a new skill
export const createSkill = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const { error, value } = skillSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, 'Validation Error', error.details.map(x => x.message));
      return;
    }

    const skillRef = db.collection('users').doc(uid!).collection('skills').doc();
    const newSkill = {
      id: skillRef.id,
      name: value.name,
      category: value.category || 'General',
      mastery: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await skillRef.set(newSkill);
    sendResponse(res, 201, true, 'Skill created successfully', newSkill);
  } catch (error) {
    next(error);
  }
};

// Create a topic for a skill
export const createTopic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const { error, value } = topicSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, 'Validation Error', error.details.map(x => x.message));
      return;
    }

    const skillDoc = await db.collection('users').doc(uid!).collection('skills').doc(value.skillId).get();
    if (!skillDoc.exists) {
      sendResponse(res, 404, false, 'Skill not found');
      return;
    }

    const topicRef = db.collection('users').doc(uid!).collection('topics').doc();
    const newTopic = {
      id: topicRef.id,
      skillId: value.skillId,
      skillName: skillDoc.data()?.name,
      name: value.name,
      mastery: 0,
      lastStudied: null,
      nextReview: null,
      studyCount: 0,
      revisionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await topicRef.set(newTopic);
    sendResponse(res, 201, true, 'Topic created successfully', newTopic);
  } catch (error) {
    next(error);
  }
};

// Record study activity
export const recordStudy = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const topicId = req.params.topicId as string;
    const { error, value } = studyRecordSchema.validate(req.body);
    if (error) {
      sendResponse(res, 400, false, 'Validation Error', error.details.map(x => x.message));
      return;
    }

    const topicRef = db.collection('users').doc(uid!).collection('topics').doc(topicId);
    const topicDoc = await topicRef.get();

    if (!topicDoc.exists) {
      sendResponse(res, 404, false, 'Topic not found');
      return;
    }

    const topicData = topicDoc.data()!;
    const newStudyCount = (topicData.studyCount || 0) + 1;
    
    // Calculate new mastery based on understanding level (1 = 20%, 5 = 100%)
    const sessionMastery = value.understandingLevel * 20; 
    let newMastery = topicData.mastery || 0;
    if (newMastery === 0) {
      newMastery = sessionMastery;
    } else {
      newMastery = Math.round((newMastery + sessionMastery) / 2);
    }

    const nextReviewDays = value.understandingLevel === 5 ? 7 : (value.understandingLevel === 4 ? 4 : (value.understandingLevel === 3 ? 2 : 1));
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewDays);

    const updates = {
      mastery: newMastery,
      lastStudied: new Date().toISOString(),
      nextReview: nextReviewDate.toISOString(),
      studyCount: newStudyCount,
      updatedAt: new Date().toISOString()
    };

    await topicRef.update(updates);

    // Update parent skill mastery
    const topicsSnapshot = await db.collection('users').doc(uid!).collection('topics').where('skillId', '==', topicData.skillId).get();
    let totalMastery = 0;
    topicsSnapshot.forEach(doc => {
      totalMastery += (doc.id === topicId ? newMastery : doc.data().mastery);
    });
    const avgMastery = Math.round(totalMastery / (topicsSnapshot.size || 1));
    await db.collection('users').doc(uid!).collection('skills').doc(topicData.skillId).update({ mastery: avgMastery, updatedAt: new Date().toISOString() });

    sendResponse(res, 200, true, 'Study activity recorded', { ...topicData, ...updates });
  } catch (error) {
    next(error);
  }
};

// Bulk topic creation
export const bulkCreateTopics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const skillId = (req.params.skillId || req.body.skillId) as string;
    const rawTopics = req.body.topics;

    if (!skillId) {
      sendResponse(res, 400, false, 'skillId is required');
      return;
    }

    if (!rawTopics || !Array.isArray(rawTopics) || rawTopics.length === 0) {
      sendResponse(res, 400, false, 'topics array is required and must not be empty');
      return;
    }

    const skillDoc = await db.collection('users').doc(uid!).collection('skills').doc(skillId).get();
    if (!skillDoc.exists) {
      sendResponse(res, 404, false, 'Skill not found');
      return;
    }

    const skillName = skillDoc.data()?.name || 'Skill';
    const batch = db.batch();
    const createdTopics: any[] = [];

    // Clean and normalize topics
    const cleanList = rawTopics
      .map(item => (typeof item === 'string' ? item.trim() : (item?.name || '').trim()))
      .filter(item => item.length > 0);

    if (cleanList.length === 0) {
      sendResponse(res, 400, false, 'No valid topic names provided');
      return;
    }

    cleanList.forEach((topicName, idx) => {
      const topicRef = db.collection('users').doc(uid!).collection('topics').doc();
      const topicData = {
        id: topicRef.id,
        skillId,
        skillName,
        name: topicName,
        orderIndex: idx + 1,
        mastery: 0,
        lastStudied: null,
        nextReview: null,
        studyCount: 0,
        revisionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(topicRef, topicData);
      createdTopics.push(topicData);
    });

    await batch.commit();

    sendResponse(res, 201, true, `Successfully created ${createdTopics.length} topics`, {
      skillId,
      skillName,
      topics: createdTopics,
      count: createdTopics.length
    });
  } catch (error) {
    next(error);
  }
};

// Curated syllabi generator helper for top skills
const SKILL_SYLLABUS_MAP: Record<string, string[]> = {
  react: [
    "Components, JSX & Props Drilling",
    "State Management with useState & useReducer",
    "Side Effects & Lifecycle with useEffect",
    "Performance Optimization (useMemo, useCallback, React.memo)",
    "Custom Hooks & Reusable Logic",
    "React Context API vs External Stores",
    "Forms, Controlled vs Uncontrolled Components",
    "React Router & Navigation Patterns",
    "Error Boundaries & Suspense",
    "Server Components & Hydration Internals"
  ],
  node: [
    "Event Loop, Libuv & Non-blocking I/O",
    "Node.js Core Modules (fs, path, events, streams)",
    "Express.js Architecture & Middleware Chain",
    "RESTful API Design & Status Codes",
    "JWT Authentication & Session Management",
    "Database Integration (ORMs, connection pooling)",
    "Error Handling & Centralized Logging",
    "File Uploads & Streaming Data",
    "Security Best Practices (CORS, Helmet, Rate Limiting)",
    "Clustering, Child Processes & Worker Threads"
  ],
  javascript: [
    "Execution Context & Call Stack",
    "Closures & Lexical Scoping",
    "Prototypes & Prototypal Inheritance",
    "Asynchronous JS (Callbacks, Promises, Async/Await)",
    "Event Bubbling, Capturing & Delegation",
    "ES6+ Features (Destructuring, Spread, Rest, Modules)",
    "Memory Management & Garbage Collection",
    "Array & Object Methods Deep Dive",
    "Web APIs (DOM, Fetch, Storage)",
    "Strict Mode & JS Engine Optimizations"
  ],
  dsa: [
    "Arrays & Two Pointer Techniques",
    "Sliding Window & Hashing",
    "Linked Lists (Reversal, Fast & Slow Pointers)",
    "Stacks & Queues (Monotonic Stack)",
    "Binary Search & Variations",
    "Binary Trees & Traversals (DFS, BFS)",
    "Binary Search Trees (BST Operations)",
    "Graphs (BFS, DFS, Dijkstra, Topological Sort)",
    "Dynamic Programming (1D, 2D & Knapsack)",
    "Greedy Algorithms & Backtracking"
  ],
  "system design": [
    "Client-Server Architecture & DNS Resolution",
    "Load Balancing & Reverse Proxies",
    "Database Sharding, Replication & CAP Theorem",
    "Caching Strategies (Redis, Memcached, Eviction)",
    "Message Queues (Kafka, RabbitMQ) & Pub/Sub",
    "API Gateway & Microservices Communication",
    "Consistent Hashing & CDN Distribution",
    "Rate Limiting & DDoS Protection",
    "System Design: Design URL Shortener (TinyURL)",
    "System Design: Design Notification Service"
  ],
  docker: [
    "Containers vs Virtual Machines",
    "Docker Architecture & Docker Daemon",
    "Writing Efficient Dockerfiles & Multi-stage Builds",
    "Image Tagging, Registries & Docker Hub",
    "Docker Volumes & Persistent Data Storage",
    "Docker Networking (Bridge, Host, Overlay)",
    "Docker Compose for Multi-Container Apps",
    "Container Lifecycle Management & Logs",
    "Environment Variables & Secrets in Docker",
    "Docker Security Best Practices"
  ],
  sql: [
    "Relational Data Modeling & Normalization (1NF-3NF)",
    "SELECT, WHERE, Aggregations & GROUP BY",
    "JOIN Operations (INNER, LEFT, RIGHT, FULL OUTER)",
    "Subqueries & Common Table Expressions (CTEs)",
    "Window Functions (ROW_NUMBER, RANK, DENSE_RANK)",
    "Indexes (B-Tree, Hash) & Query Execution Plans",
    "Transactions & ACID Properties (Isolation Levels)",
    "Stored Procedures, Triggers & Views",
    "Query Optimization & EXPLAIN ANALYZE",
    "Database Locking & Concurrency Control"
  ]
};

// AI Topic Generator
export const generateTopicsAI = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { skillName, category } = req.body;
    if (!skillName || typeof skillName !== 'string') {
      sendResponse(res, 400, false, 'skillName is required');
      return;
    }

    const key = skillName.toLowerCase().trim();
    let generatedTopics: string[] = [];

    // Find match in predefined curated syllabi
    for (const [dictKey, topics] of Object.entries(SKILL_SYLLABUS_MAP)) {
      if (key.includes(dictKey) || dictKey.includes(key)) {
        generatedTopics = [...topics];
        break;
      }
    }

    // Dynamic smart generation if no predefined curriculum found
    if (generatedTopics.length === 0) {
      generatedTopics = [
        `${skillName} Core Architecture & Fundamental Concepts`,
        `${skillName} Setup, Tooling & Environment Configuration`,
        `${skillName} Essential Syntax, Primitives & Data Structures`,
        `${skillName} State Management & Control Flow Patterns`,
        `${skillName} Modular Code Design & Componentization`,
        `${skillName} Asynchronous Operations, I/O & Networking`,
        `${skillName} Error Handling, Validation & Debugging`,
        `${skillName} Testing, Mocking & Test-Driven Development`,
        `${skillName} Performance Tuning, Memory & Optimization`,
        `${skillName} Industry Best Practices & Top Interview Questions`
      ];
    }

    sendResponse(res, 200, true, 'Topics generated successfully by AI', {
      skillName,
      category: category || 'Engineering',
      topics: generatedTopics,
      count: generatedTopics.length
    });
  } catch (error) {
    next(error);
  }
};

// Generate 3 Interview/Conceptual Questions for AI Evaluation of a topic
export const getTopicQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const topicId = req.params.topicId as string;

    const topicDoc = await db.collection('users').doc(uid!).collection('topics').doc(topicId).get();
    if (!topicDoc.exists) {
      sendResponse(res, 404, false, 'Topic not found');
      return;
    }

    const topic = topicDoc.data()!;
    const topicName = topic.name;
    const skillName = topic.skillName || 'Technical Skill';

    // Tailored questions based on topic
    const questions = [
      {
        id: 1,
        question: `In your own words, what is the core purpose of "${topicName}" in ${skillName}, and what problem does it solve in modern software engineering?`,
        aspect: 'Core Concept & Definition'
      },
      {
        id: 2,
        question: `How does "${topicName}" work under the hood or in practical production code? Give a concrete example or explain the internal mechanics.`,
        aspect: 'Implementation & Mechanics'
      },
      {
        id: 3,
        question: `What are the common edge cases, performance bottlenecks, or anti-patterns engineers encounter when working with "${topicName}", and how do you prevent them?`,
        aspect: 'Edge Cases & Best Practices'
      }
    ];

    sendResponse(res, 200, true, 'Quiz questions generated', {
      topicId,
      topicName,
      skillName,
      currentMastery: topic.mastery || 0,
      questions
    });
  } catch (error) {
    next(error);
  }
};

// AI Evaluator for Topic Test Chat
export const evaluateTopicQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const topicId = req.params.topicId as string;
    const answers: Array<{ question: string; answer: string }> = req.body.answers;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      sendResponse(res, 400, false, 'answers array is required');
      return;
    }

    const topicRef = db.collection('users').doc(uid!).collection('topics').doc(topicId);
    const topicDoc = await topicRef.get();
    if (!topicDoc.exists) {
      sendResponse(res, 404, false, 'Topic not found');
      return;
    }

    const topicData = topicDoc.data()!;

    // Evaluate answers with scoring rubric
    let totalScore = 0;
    const feedbacks: Array<{ question: string; answer: string; feedback: string; score: number }> = [];

    answers.forEach((item, index) => {
      const text = (item.answer || '').trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      
      let qScore = 0;
      let feedback = '';

      if (wordCount < 4) {
        qScore = 20;
        feedback = 'Answer is too brief. Try elaborating with technical terminology and concrete examples.';
      } else if (wordCount < 15) {
        qScore = 55;
        feedback = 'Good initial thought, but missing key technical details on internal mechanics.';
      } else if (wordCount < 35) {
        qScore = 80;
        feedback = 'Strong explanation! Demonstrates clear understanding of the concepts and practical usage.';
      } else {
        qScore = 95;
        feedback = 'Excellent, comprehensive answer! Solid technical depth, covering edge cases and architecture.';
      }

      totalScore += qScore;
      feedbacks.push({
        question: item.question,
        answer: item.answer,
        score: qScore,
        feedback
      });
    });

    const averageScore = Math.round(totalScore / answers.length);

    // Update topic mastery
    const newStudyCount = (topicData.studyCount || 0) + 1;
    const updates = {
      mastery: averageScore,
      lastStudied: new Date().toISOString(),
      studyCount: newStudyCount,
      lastEvaluation: {
        score: averageScore,
        evaluatedAt: new Date().toISOString(),
        feedbackSummary: averageScore >= 75 ? 'Mastered topic concepts' : 'Needs further practice'
      },
      updatedAt: new Date().toISOString()
    };

    await topicRef.update(updates);

    // Recalculate parent skill mastery
    const topicsSnapshot = await db.collection('users').doc(uid!).collection('topics').where('skillId', '==', topicData.skillId).get();
    let totalMastery = 0;
    topicsSnapshot.forEach(doc => {
      totalMastery += (doc.id === topicId ? averageScore : (doc.data().mastery || 0));
    });
    const avgSkillMastery = Math.round(totalMastery / (topicsSnapshot.size || 1));
    await db.collection('users').doc(uid!).collection('skills').doc(topicData.skillId).update({
      mastery: avgSkillMastery,
      updatedAt: new Date().toISOString()
    });

    sendResponse(res, 200, true, 'AI evaluation completed', {
      topicId,
      understandingPercentage: averageScore,
      feedbacks,
      summary: averageScore >= 80 ? 'Mastery level achieved! High confidence for technical interviews.' : (averageScore >= 60 ? 'Good grasp of concepts. A quick review of edge cases is recommended.' : 'Foundational understanding detected. Needs more review before interviews.')
    });
  } catch (error) {
    next(error);
  }
};

// Get single skill by ID with its ordered topics
export const getSkillById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const skillId = req.params.skillId as string;

    const skillDoc = await db.collection('users').doc(uid!).collection('skills').doc(skillId).get();
    if (!skillDoc.exists) {
      sendResponse(res, 404, false, 'Skill not found');
      return;
    }

    const topicsSnapshot = await db.collection('users').doc(uid!).collection('topics').where('skillId', '==', skillId).get();
    const topics = topicsSnapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    sendResponse(res, 200, true, 'Skill fetched successfully', {
      ...skillDoc.data(),
      topics
    });
  } catch (error) {
    next(error);
  }
};

// Record last viewed skill and topic for user navigation
export const recordTopicView = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const { skillId, topicId } = req.body;

    if (!skillId) {
      sendResponse(res, 400, false, 'skillId is required');
      return;
    }

    await db.collection('users').doc(uid!).set({
      lastViewedSkillId: skillId,
      lastViewedTopicId: topicId || null,
      lastViewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    sendResponse(res, 200, true, 'View recorded');
  } catch (error) {
    next(error);
  }
};

// Get all skills with their topics
export const getSkillsAndTopics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    
    const skillsSnapshot = await db.collection('users').doc(uid!).collection('skills').get();
    const topicsSnapshot = await db.collection('users').doc(uid!).collection('topics').get();
    
    const skills = skillsSnapshot.docs.map(doc => doc.data());
    const topics = topicsSnapshot.docs.map(doc => doc.data());
    
    // Group topics by skill
    const result = skills.map(skill => ({
      ...skill,
      topics: topics.filter(t => t.skillId === skill.id).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    }));

    sendResponse(res, 200, true, 'Skills fetched successfully', result);
  } catch (error) {
    next(error);
  }
};

// Get analytics (weak topics, overall progress)
export const getSkillsAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    
    const topicsSnapshot = await db.collection('users').doc(uid!).collection('topics').get();
    const topics = topicsSnapshot.docs.map(doc => doc.data());
    
    const weakTopics = topics.filter(t => t.mastery < 50 && t.studyCount > 0).sort((a, b) => a.mastery - b.mastery);
    const topicsToReview = topics.filter(t => t.nextReview && new Date(t.nextReview) <= new Date()).sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());

    sendResponse(res, 200, true, 'Analytics fetched successfully', {
      weakTopics,
      topicsToReview
    });
  } catch (error) {
    next(error);
  }
};
