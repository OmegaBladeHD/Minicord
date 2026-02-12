import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  email: string;
  pseudo: string;
  role: 'user' | 'admin';
};

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });

export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret) as JwtPayload;
