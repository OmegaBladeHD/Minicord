import { NextFunction, Request, RequestHandler, Response } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { ZodSchema } from 'zod';

export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: result.error.flatten() });
      return;
    }

    req.body = result.data;
    next();
  };
};
