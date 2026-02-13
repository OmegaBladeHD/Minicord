import { Router } from 'express';
import { z } from 'zod';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { query } from '../config/db.js';
import { redis } from '../config/redis.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const querySchema = z.object({ q: z.string().min(2).max(50) });

export const usersRouter = Router();
usersRouter.use(authMiddleware);

usersRouter.get('/me', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const cacheKey = `user:me:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const result = await query<{
    id: string;
    pseudo: string;
    username: string;
    email: string;
    avatar: string | null;
    status: string;
    role: 'user' | 'admin';
  }>('SELECT id, pseudo, username, email, avatar, status, role FROM users WHERE id = $1 LIMIT 1', [userId]);

  if (!result.rowCount) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
  }

  await redis.set(cacheKey, JSON.stringify(result.rows[0]), { EX: 300 });
  return res.json(result.rows[0]);
}));

usersRouter.get('/search', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const q = parsed.data.q.trim();
  const result = await query<{
    id: string;
    pseudo: string;
    username: string;
    avatar: string | null;
    status: string;
  }>(
    `SELECT id, pseudo, username, avatar, status
     FROM users
     WHERE username ILIKE $1 OR pseudo ILIKE $1
     ORDER BY created_at DESC
     LIMIT 12`,
    [`%${q}%`]
  );

  const statuses = await redis.hGetAll('presence');
  const payload = result.rows.map((row: { id: string; pseudo: string; username: string; avatar: string | null; status: string }) => ({
    ...row,
    status: statuses[row.id] ?? row.status
  }));

  return res.json(payload);
}));
