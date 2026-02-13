import { Router } from 'express';
import { z } from 'zod';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { query } from '../config/db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { addGroupMember, createGroup, getUserRoleInGroup } from '../services/groupService.js';
import { groupRolePermissions, hasPermission, Permission } from '../types/permissions.js';
import { addMemberSchema, createGroupSchema } from '../validators/groupValidators.js';

const paramsGroupSchema = z.object({ groupId: z.string().uuid() });
const removeMemberParamsSchema = z.object({ groupId: z.string().uuid(), userId: z.string().uuid() });

export const groupsRouter = Router();
groupsRouter.use(authMiddleware);

groupsRouter.get('/mine', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const groups = await query<{
    id: string;
    name: string;
    description: string | null;
    role: 'owner' | 'admin' | 'member';
  }>(
    `SELECT g.id, g.name, g.description, gm.role
     FROM groups g
     INNER JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.created_at DESC
     LIMIT 100`,
    [userId]
  );

  return res.json(groups.rows);
}));

groupsRouter.post('/', validateBody(createGroupSchema), asyncHandler(async (req: AuthRequest, res) => {
  const ownerId = req.user!.id;
  const { name, description } = req.body;

  const created = await createGroup(name, description || null, ownerId);
  const groupId = created.rows[0].id;
  await addGroupMember(groupId, ownerId, 'owner');

  return res.status(HTTP_STATUS.CREATED).json({ groupId });
}));

groupsRouter.post('/:groupId/members', validateBody(addMemberSchema), asyncHandler(async (req: AuthRequest, res) => {
  const parsed = paramsGroupSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const { groupId } = parsed.data;
  const { userId } = req.body;
  const requester = req.user!.id;

  const roleCheck = await getUserRoleInGroup(groupId, requester);
  if (!roleCheck.rowCount) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
  }

  const requesterPermissions = groupRolePermissions[roleCheck.rows[0].role as keyof typeof groupRolePermissions];
  if (!hasPermission(requesterPermissions, Permission.INVITE_MEMBER)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
  }

  await addGroupMember(groupId, userId, 'member');

  return res.status(HTTP_STATUS.NO_CONTENT).send();
}));

groupsRouter.delete('/:groupId/members/:userId', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = removeMemberParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const { groupId, userId } = parsed.data;
  const requester = req.user!.id;

  const requesterRole = await getUserRoleInGroup(groupId, requester);
  if (!requesterRole.rowCount) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
  }

  const isSelfLeave = requester === userId;
  const requesterPermissions = groupRolePermissions[requesterRole.rows[0].role as keyof typeof groupRolePermissions];
  const canManage = hasPermission(requesterPermissions, Permission.REMOVE_MEMBER);

  if (!isSelfLeave && !canManage) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
  }

  await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}));
