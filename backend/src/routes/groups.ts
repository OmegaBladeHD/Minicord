import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const groupSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(250).optional()
});

const memberSchema = z.object({ userId: z.string().uuid() });

export const groupsRouter = Router();
groupsRouter.use(authMiddleware);

groupsRouter.post('/', validateBody(groupSchema), async (req: AuthRequest, res) => {
  const ownerId = req.user!.id;
  const { name, description } = req.body;

  const created = await query<{ id: string }>(
    'INSERT INTO groups (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id',
    [name, description || null, ownerId]
  );

  const groupId = created.rows[0].id;
  await query('INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)', [
    groupId,
    ownerId,
    'owner'
  ]);

  return res.status(201).json({ groupId });
});

groupsRouter.post('/:groupId/members', validateBody(memberSchema), async (req: AuthRequest, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  const requester = req.user!.id;

  const roleCheck = await query<{ role: 'owner' | 'admin' | 'member' }>(
    'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1',
    [groupId, requester]
  );

  if (!roleCheck.rowCount || roleCheck.rows[0].role === 'member') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, 'member')
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, userId]
  );

  return res.status(204).send();
});
