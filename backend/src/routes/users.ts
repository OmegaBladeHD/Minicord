import { Router } from 'express';
import { query } from '../config/db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(authMiddleware);

usersRouter.get('/me', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
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
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json(result.rows[0]);
});

usersRouter.get('/search', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

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

  return res.json(result.rows);
});
