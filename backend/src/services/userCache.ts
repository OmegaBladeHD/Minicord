import { USER_CACHE_TTL_SECONDS } from '../constants.js';
import { query } from '../config/db.js';
import { redis } from '../config/redis.js';

export type PublicUserProfile = {
  id: string;
  pseudo: string;
  avatar: string | null;
  username?: string;
};

export const getCachedUserProfile = async (userId: string): Promise<PublicUserProfile | null> => {
  const key = `user:profile:${userId}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as PublicUserProfile;

  const result = await query<PublicUserProfile>(
    'SELECT id, pseudo, avatar, username FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  if (!result.rowCount) return null;

  await redis.set(key, JSON.stringify(result.rows[0]), { EX: USER_CACHE_TTL_SECONDS });
  return result.rows[0];
};

export const invalidateCachedUserProfile = async (userId: string) => {
  await redis.del(`user:profile:${userId}`);
};
