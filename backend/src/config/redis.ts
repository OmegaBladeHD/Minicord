import { createClient } from 'redis';
import { env } from './env.js';

export const redis = createClient({ url: env.redisUrl });

export const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect();
  }
};
