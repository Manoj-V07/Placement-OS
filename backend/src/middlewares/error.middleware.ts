import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/response';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  sendResponse(
    res,
    statusCode,
    false,
    message,
    env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};
