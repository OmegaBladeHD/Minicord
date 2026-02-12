import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/jwt.js';

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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(authHeader.replace('Bearer ', ''));
    req.user = {
      id: payload.sub,
      email: payload.email,
      pseudo: payload.pseudo,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
