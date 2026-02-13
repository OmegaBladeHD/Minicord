import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { logger } from '../services/logger.js';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      message: err.message,
      stack: err.stack,
      endpoint: req.originalUrl,
      method: req.method,
      userId: (req as { user?: { id?: string } }).user?.id
    },
    'Unhandled error'
  );
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
};
