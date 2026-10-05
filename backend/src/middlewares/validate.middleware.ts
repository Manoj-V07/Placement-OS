import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { sendResponse } from '../utils/response';

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return sendResponse(res, 400, false, 'Validation Error', { details: errorMessage });
    }

    next();
  };
}; 