import { Router } from 'express';
import { z } from 'zod';
import {
  DEFAULT_MESSAGE_PAGE_SIZE,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGE_PAGE_SIZE
} from '../constants.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { query } from '../config/db.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createMessage } from '../services/messageService.js';
import { isParticipantInDmRoom, TargetType } from '../types/chat.js';
import { searchMessagesSchema, sendMessageSchema } from '../validators/messageValidators.js';

const paramsSchema = z.object({ targetType: z.enum(['dm', 'group']), targetId: z.string().min(1) });
const messageIdSchema = z.object({ id: z.string().uuid() });
const editSchema = z.object({ content: z.string().min(1).max(MAX_MESSAGE_LENGTH) });
const reactSchema = z.object({ emoji: z.string().min(1).max(16) });

const canReadTarget = async (targetType: TargetType, targetId: string, userId: string) => {
  if (targetType === 'dm') {
    return isParticipantInDmRoom(targetId, userId);
  }

  if (!z.string().uuid().safeParse(targetId).success) {
    return false;
  }

  const membership = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [targetId, userId]);
  return membership.rowCount > 0;
};

export const messagesRouter = Router();
messagesRouter.use(authMiddleware);

messagesRouter.post('/', validateBody(sendMessageSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { targetType, targetId, content } = req.body;
  const authorId = req.user!.id;

  if (!(await canReadTarget(targetType, targetId, authorId))) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden target' });
  }

  const inserted = await createMessage(authorId, targetType, targetId, content);
  return res.status(HTTP_STATUS.CREATED).json({ id: inserted.rows[0].id, timestamp: inserted.rows[0].created_at });
}));

messagesRouter.patch('/:id', validateBody(editSchema), asyncHandler(async (req: AuthRequest, res) => {
  const parsed = messageIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const messageId = parsed.data.id;
  const userId = req.user!.id;
  const { content } = req.body;

  const updated = await query<{ id: string; edited_at: string }>(
    `UPDATE messages SET content = $1, edited_at = NOW()
     WHERE id = $2 AND author_id = $3 AND deleted_at IS NULL
     RETURNING id, edited_at`,
    [content, messageId, userId]
  );
  if (!updated.rowCount) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Message not found' });
  }
  return res.json({ id: updated.rows[0].id, editedAt: updated.rows[0].edited_at, content });
}));

messagesRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = messageIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const messageId = parsed.data.id;
  const userId = req.user!.id;

  const deleted = await query(
    `UPDATE messages SET deleted_at = NOW(), content = '[Message supprimé]'
     WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL`,
    [messageId, userId]
  );
  if (!deleted.rowCount) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Message not found' });
  }
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}));

messagesRouter.post('/:id/reactions', validateBody(reactSchema), asyncHandler(async (req: AuthRequest, res) => {
  const parsed = messageIdSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const { emoji } = req.body;
  const userId = req.user!.id;

  await query(
    `INSERT INTO message_reactions (message_id, user_id, emoji)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
    [parsed.data.id, userId, emoji]
  );
  return res.status(HTTP_STATUS.CREATED).json({ ok: true });
}));

messagesRouter.get('/search/query', asyncHandler(async (req: AuthRequest, res) => {
  const parsed = searchMessagesSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsed.error.flatten() });
  }

  const { q, conversationId, targetType } = parsed.data;
  const userId = req.user!.id;
  if (!(await canReadTarget(targetType, conversationId, userId))) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden target' });
  }

  const result = await query<{
    id: string;
    author_id: string;
    author_pseudo: string | null;
    author_avatar: string | null;
    content: string;
    created_at: string;
  }>(
    `SELECT m.id, m.author_id, u.pseudo AS author_pseudo, u.avatar AS author_avatar, m.content, m.created_at
     FROM messages m
     INNER JOIN users u ON u.id = m.author_id
     WHERE m.target_type = $1 AND m.target_id = $2 AND m.content ILIKE $3
     ORDER BY m.created_at DESC
     LIMIT 50`,
    [targetType, conversationId, `%${q}%`]
  );

  return res.json(
    result.rows.map((row: {
      id: string;
      author_id: string;
      author_pseudo: string | null;
      author_avatar: string | null;
      content: string;
      created_at: string;
    }) => ({
      id: row.id,
      authorId: row.author_id,
      authorPseudo: row.author_pseudo ?? 'Unknown',
      authorAvatar: row.author_avatar ?? null,
      content: row.content,
      timestamp: row.created_at
    }))
  );
}));

messagesRouter.get('/:targetType/:targetId', asyncHandler(async (req: AuthRequest, res) => {
  const parsedParams = paramsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: parsedParams.error.flatten() });
  }

  const { targetType, targetId } = parsedParams.data;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const rawLimit = Number(req.query.limit ?? DEFAULT_MESSAGE_PAGE_SIZE);
  const sanitizedLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : DEFAULT_MESSAGE_PAGE_SIZE;
  const limit = Math.min(Math.max(1, sanitizedLimit), MAX_MESSAGE_PAGE_SIZE);
  const userId = req.user!.id;

  if (!(await canReadTarget(targetType, targetId, userId))) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden target' });
  }

  const result = await query<{
    id: string;
    author_id: string;
    author_pseudo: string | null;
    author_avatar: string | null;
    content: string;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
  }>(
    `SELECT m.id, m.author_id, u.pseudo AS author_pseudo, u.avatar AS author_avatar,
            m.content, m.created_at, m.edited_at, m.deleted_at
     FROM messages m
     INNER JOIN users u ON u.id = m.author_id
     WHERE m.target_type = $1 AND m.target_id = $2 AND ($3::timestamptz IS NULL OR m.created_at < $3)
     ORDER BY m.created_at DESC
     LIMIT $4`,
    [targetType, targetId, cursor ?? null, limit + 1]
  );

  const messageIds = result.rows.map((row: { id: string }) => row.id);
  const reactionRows = messageIds.length
    ? await query<{ message_id: string; emoji: string; count: string }>(
        `SELECT message_id, emoji, COUNT(*)::text as count
         FROM message_reactions
         WHERE message_id = ANY($1::uuid[])
         GROUP BY message_id, emoji`,
        [messageIds]
      )
    : { rows: [] };

  const reactionMap = new Map<string, Array<{ emoji: string; count: number }>>();
  for (const row of reactionRows.rows) {
    const current = reactionMap.get(row.message_id) ?? [];
    current.push({ emoji: row.emoji, count: Number(row.count) });
    reactionMap.set(row.message_id, current);
  }

  const hasMore = result.rows.length > limit;
  const sliced = result.rows.slice(0, limit).reverse();
  const nextCursor = hasMore ? result.rows[limit - 1].created_at : null;

  const items = sliced.map((message: {
    id: string;
    author_id: string;
    author_pseudo: string | null;
    author_avatar: string | null;
    content: string;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
  }) => ({
    id: message.id,
    authorId: message.author_id,
    authorPseudo: message.author_pseudo ?? 'Unknown',
    authorAvatar: message.author_avatar ?? null,
    content: message.content,
    timestamp: message.created_at,
    editedAt: message.edited_at,
    deletedAt: message.deleted_at,
    reactions: reactionMap.get(message.id) ?? []
  }));

  return res.json({ items, hasMore, nextCursor });
}));
