import { NextFunction, Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { verifyAccessToken } from '../services/jwt.js';

export type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
    pseudo: string;
    role: 'user' | 'admin';
  };
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyAccessToken(authHeader.replace('Bearer ', ''));
    req.user = {
      id: payload.sub,
      email: payload.email,
      pseudo: payload.pseudo,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid token' });
  }
};
