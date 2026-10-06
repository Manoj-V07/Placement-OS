import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import { DecodedIdToken } from 'firebase-admin/auth';
import { sendResponse } from '../utils/response';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendResponse(res, 401, false, 'Unauthorized: Missing or invalid token');
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    sendResponse(res, 401, false, 'Unauthorized: Invalid or expired token');
  }
};
