import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { isParticipantInDmRoom, TargetType } from '../types/chat.js';

const messageSchema = z.object({
  targetType: z.enum(['dm', 'group']),
  targetId: z.string().min(1),
  content: z.string().min(1).max(2000)
});

const canReadTarget = async (targetType: TargetType, targetId: string, userId: string) => {
  if (targetType === 'dm') return isParticipantInDmRoom(targetId, userId);

  const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [
    targetId,
    userId
  ]);
  return membership.rowCount > 0;
};

export const messagesRouter = Router();
messagesRouter.use(authMiddleware);

messagesRouter.post('/', validateBody(messageSchema), async (req: AuthRequest, res) => {
  const { targetType, targetId, content } = req.body;
  const authorId = req.user!.id;

  if (!(await canReadTarget(targetType, targetId, authorId))) {
    return res.status(403).json({ error: 'Forbidden target' });
  }

  const inserted = await query<{ id: string; created_at: string }>(
    `INSERT INTO messages (author_id, target_type, target_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [authorId, targetType, targetId, content]
  );

  return res.status(201).json(inserted.rows[0]);
});

messagesRouter.get('/:targetType/:targetId', async (req: AuthRequest, res) => {
  const targetType = req.params.targetType as TargetType;
  const { targetId } = req.params;
  const before = req.query.before as string | undefined;
  const userId = req.user!.id;

  if (targetType !== 'dm' && targetType !== 'group') {
    return res.status(400).json({ error: 'Unknown target type' });
  }

  if (!(await canReadTarget(targetType, targetId, userId))) {
    return res.status(403).json({ error: 'Forbidden target' });
  }

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
