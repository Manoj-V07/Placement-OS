import { Request, Response } from 'express';
import { db } from '../config/firebase';

export const checkHealth = async (req: Request, res: Response) => {
  let databaseStatus = 'disconnected';
  
  try {
    // A simple test to check Firestore connection
    await db.collection('_health_check').limit(1).get();
    databaseStatus = 'connected';
  } catch (error) {
    console.error('Firestore health check failed:', error);
  }

  res.status(200).json({
    success: true,
    server: 'running',
    database: databaseStatus
  });
};
