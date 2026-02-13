import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';

export type JwtPayload = {
  sub: string;
  email: string;
  pseudo: string;
  role: 'user' | 'admin';
  type: 'access';
};

export const signAccessToken = (payload: Omit<JwtPayload, 'type'>) =>
  jwt.sign({ ...payload, type: 'access' }, env.jwtSecret, { expiresIn: env.accessTokenTtl as SignOptions['expiresIn'] });

export const verifyAccessToken = (token: string) => {
  const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload;
};

export const createRefreshToken = async (userId: string) => {
  const token = crypto.randomBytes(48).toString('hex');
  await redis.set(`refresh:${token}`, userId, { EX: env.refreshTokenTtlSeconds });
  return token;
};

export const consumeRefreshToken = async (token: string) => {
  const key = `refresh:${token}`;
  const userId = await redis.get(key);
  if (!userId) return null;
  await redis.del(key);
  return userId;
};
