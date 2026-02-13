import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEFAULT_PORT = 4000;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const DEFAULT_UPLOAD_DIR = 'backend/uploads';
const DEFAULT_VOICE_MAX_BITRATE_KBPS = 124;

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  POSTGRES_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  CLIENT_URL: z.string().url(),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(DEFAULT_REFRESH_TOKEN_TTL_SECONDS),
  ACCESS_TOKEN_TTL: z.string().default(DEFAULT_ACCESS_TOKEN_TTL),
  UPLOAD_DIR: z.string().default(DEFAULT_UPLOAD_DIR),
  VOICE_MAX_BITRATE_KBPS: z.coerce.number().int().positive().max(512).default(DEFAULT_VOICE_MAX_BITRATE_KBPS)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = JSON.stringify(parsed.error.flatten().fieldErrors);
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = {
  port: parsed.data.PORT,
  postgresUrl: parsed.data.POSTGRES_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  clientUrl: parsed.data.CLIENT_URL,
  refreshTokenTtlSeconds: parsed.data.REFRESH_TOKEN_TTL_SECONDS,
  accessTokenTtl: parsed.data.ACCESS_TOKEN_TTL,
  uploadDir: parsed.data.UPLOAD_DIR,
  voiceMaxBitrateKbps: parsed.data.VOICE_MAX_BITRATE_KBPS
};
