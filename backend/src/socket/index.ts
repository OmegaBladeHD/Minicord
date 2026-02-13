import { Server } from 'socket.io';
import { MAX_MESSAGE_LENGTH } from '../constants.js';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { verifyAccessToken } from '../services/jwt.js';
import { logger } from '../services/logger.js';
import { getCachedUserProfile } from '../services/userCache.js';
import { isParticipantInDmRoom, normalizeDmRoom } from '../types/chat.js';

const isGroupMember = async (groupId: string, userId: string) => {
  const result = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [groupId, userId]);
  return result.rowCount > 0;
};

export const attachSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      return next();
    } catch (error) {
      logger.warn({ error }, 'socket auth failed');
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string;
    const profile = await getCachedUserProfile(userId);
    await redis.hSet('presence', userId, 'online');
    await redis.hSet('last_seen', userId, new Date().toISOString());
    io.emit('presence:update', { userId, status: 'online' });

    socket.on('join:dm', (peerUserId: string) => socket.join(normalizeDmRoom(userId, peerUserId)));

    socket.on('join:group', async (groupId: string, ack) => {
      if (!(await isGroupMember(groupId, userId))) return ack?.({ ok: false, error: 'Forbidden group' });
      socket.join(`group:${groupId}`);
      ack?.({ ok: true });
    });

    socket.on('typing', async (payload) => {
      const { targetType, targetId, isTyping } = payload as { targetType: 'dm' | 'group'; targetId: string; isTyping: boolean };
      const allowed = targetType === 'dm' ? isParticipantInDmRoom(targetId, userId) : await isGroupMember(targetId, userId);
      if (!allowed) return;
      const room = targetType === 'group' ? `group:${targetId}` : targetId;
      socket.to(room).emit('user:typing', { userId, pseudo: profile?.pseudo ?? 'Unknown', targetType, targetId, isTyping });
    });

    socket.on('reaction:add', async (payload, ack) => {
      const { messageId, emoji, targetType, targetId } = payload as { messageId: string; emoji: string; targetType: 'dm' | 'group'; targetId: string };
      const allowed = targetType === 'dm' ? isParticipantInDmRoom(targetId, userId) : await isGroupMember(targetId, userId);
      if (!allowed) return ack?.({ ok: false, error: 'Forbidden target' });

      await query(
        `INSERT INTO message_reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
        [messageId, userId, emoji]
      );
      const room = targetType === 'group' ? `group:${targetId}` : targetId;
      io.to(room).emit('reaction:added', { messageId, emoji, userId });
      ack?.({ ok: true });
    });

    socket.on('message:update', async (payload, ack) => {
      const { messageId, content, targetType, targetId } = payload as { messageId: string; content: string; targetType: 'dm' | 'group'; targetId: string };
      const updated = await query<{ edited_at: string }>(
        `UPDATE messages SET content = $1, edited_at = NOW()
         WHERE id = $2 AND author_id = $3 AND deleted_at IS NULL
         RETURNING edited_at`,
        [content, messageId, userId]
      );
      if (!updated.rowCount) return ack?.({ ok: false, error: 'Message not found' });
      const room = targetType === 'group' ? `group:${targetId}` : targetId;
      io.to(room).emit('message:updated', { messageId, content, editedAt: updated.rows[0].edited_at });
      ack?.({ ok: true });
    });

    socket.on('message:delete', async (payload, ack) => {
      const { messageId, targetType, targetId } = payload as { messageId: string; targetType: 'dm' | 'group'; targetId: string };
      const deleted = await query(
        `UPDATE messages SET deleted_at = NOW(), content = '[Message supprimé]'
         WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL`,
        [messageId, userId]
      );
      if (!deleted.rowCount) return ack?.({ ok: false, error: 'Message not found' });
      const room = targetType === 'group' ? `group:${targetId}` : targetId;
      io.to(room).emit('message:deleted', { messageId });
      ack?.({ ok: true });
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const { targetType, targetId, content } = payload as { targetType: 'dm' | 'group'; targetId: string; content: string };
        if (!content?.trim() || content.length > MAX_MESSAGE_LENGTH) return ack?.({ ok: false, error: 'Invalid content' });
        const allowed = targetType === 'dm' ? isParticipantInDmRoom(targetId, userId) : await isGroupMember(targetId, userId);
        if (!allowed) return ack?.({ ok: false, error: 'Forbidden target' });

        const inserted = await query<{ id: string; created_at: string }>(
          `INSERT INTO messages (author_id, target_type, target_id, content)
           VALUES ($1, $2, $3, $4)
           RETURNING id, created_at`,
          [userId, targetType, targetId, content]
        );

        const room = targetType === 'group' ? `group:${targetId}` : targetId;
        io.to(room).emit('message:new', {
          id: inserted.rows[0].id,
          authorId: userId,
          authorPseudo: profile?.pseudo ?? 'Unknown',
          authorAvatar: profile?.avatar ?? null,
          targetType,
          targetId,
          content,
          timestamp: inserted.rows[0].created_at,
          reactions: []
        });
        ack?.({ ok: true });
      } catch (error) {
        logger.error({ error, userId }, 'socket message:send failed');
        ack?.({ ok: false, error: 'Failed to send message' });
      }
    });

    socket.on('voice:state', async (payload) => {
      const data = payload as { state: 'in_call' | 'offline'; bitrateKbps?: number } | 'in_call' | 'offline';
      const state = typeof data === 'string' ? data : data.state;
      const rawBitrate = typeof data === 'string' ? undefined : data.bitrateKbps;
      const requestedBitrateKbps = Number.isFinite(rawBitrate)
        ? Math.trunc(rawBitrate as number)
        : env.voiceMaxBitrateKbps;
      const bitrateKbps = Math.min(Math.max(1, requestedBitrateKbps), env.voiceMaxBitrateKbps);

      await redis.hSet('presence', userId, state);
      await redis.hSet('last_seen', userId, new Date().toISOString());
      socket.broadcast.emit('presence:update', { userId, status: state, bitrateKbps });
    });

    socket.on('disconnect', async () => {
      await redis.hSet('presence', userId, 'offline');
      await redis.hSet('last_seen', userId, new Date().toISOString());
      socket.broadcast.emit('presence:update', { userId, status: 'offline' });
    });
  });
};
