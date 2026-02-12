import { Server } from 'socket.io';
import { query } from '../config/db.js';
import { redis } from '../config/redis.js';
import { verifyToken } from '../services/jwt.js';
import { isParticipantInDmRoom, normalizeDmRoom } from '../types/chat.js';

const isGroupMember = async (groupId: string, userId: string) => {
  const result = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 LIMIT 1', [
    groupId,
    userId
  ]);
  return result.rowCount > 0;
};

export const attachSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.sub;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string;
    await redis.hSet('presence', userId, 'online');

    socket.on('join:dm', (peerUserId: string) => {
      const room = normalizeDmRoom(userId, peerUserId);
      socket.join(room);
    });

    socket.on('join:group', async (groupId: string, ack) => {
      if (!(await isGroupMember(groupId, userId))) {
        ack?.({ ok: false, error: 'Forbidden group' });
        return;
      }
      socket.join(`group:${groupId}`);
      ack?.({ ok: true });
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const { targetType, targetId, content } = payload as {
          targetType: 'dm' | 'group';
          targetId: string;
          content: string;
        };

        if (!content?.trim()) {
          ack?.({ ok: false, error: 'Empty message' });
          return;
        }

        const allowed =
          targetType === 'dm'
            ? isParticipantInDmRoom(targetId, userId)
            : await isGroupMember(targetId, userId);

        if (!allowed) {
          ack?.({ ok: false, error: 'Forbidden target' });
          return;
        }

        const inserted = await query<{ id: string; created_at: string }>(
          `INSERT INTO messages (author_id, target_type, target_id, content)
           VALUES ($1, $2, $3, $4)
           RETURNING id, created_at`,
          [userId, targetType, targetId, content]
        );

        const event = {
          id: inserted.rows[0].id,
          authorId: userId,
          targetType,
          targetId,
          content,
          timestamp: inserted.rows[0].created_at
        };

        const room = targetType === 'group' ? `group:${targetId}` : targetId;
        io.to(room).emit('message:new', event);
        ack?.({ ok: true, event });
      } catch {
        ack?.({ ok: false, error: 'Failed to send message' });
      }
    });

    socket.on('voice:state', async (state: 'in_call' | 'offline') => {
      await redis.hSet('presence', userId, state);
      socket.broadcast.emit('presence:update', { userId, state });
    });

    socket.on('disconnect', async () => {
      await redis.hSet('presence', userId, 'offline');
    });
  });
};
