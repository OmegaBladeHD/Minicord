import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const messageSchema = z.object({
  targetType: z.enum(['dm', 'group']),
  targetId: z.string().min(1),
  content: z.string().min(1).max(2000)
});

export const messagesRouter = Router();
messagesRouter.use(authMiddleware);

messagesRouter.post('/', validateBody(messageSchema), async (req: AuthRequest, res) => {
  const { targetType, targetId, content } = req.body;
  const authorId = req.user!.id;

  const inserted = await query<{ id: string; created_at: string }>(
    `INSERT INTO messages (author_id, target_type, target_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [authorId, targetType, targetId, content]
  );

  return res.status(201).json(inserted.rows[0]);
});

messagesRouter.get('/:targetType/:targetId', async (req: AuthRequest, res) => {
  const { targetType, targetId } = req.params;
  const before = req.query.before as string | undefined;

  const result = await query<{
    id: string;
    author_id: string;
    content: string;
    created_at: string;
  }>(
    `SELECT id, author_id, content, created_at
     FROM messages
     WHERE target_type = $1 AND target_id = $2
       AND ($3::timestamptz IS NULL OR created_at < $3)
     ORDER BY created_at DESC
     LIMIT 30`,
    [targetType, targetId, before ?? null]
  );

  return res.json(result.rows.reverse());
});
