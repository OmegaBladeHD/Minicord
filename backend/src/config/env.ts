import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  postgresUrl: process.env.POSTGRES_URL ?? 'postgres://postgres:postgres@localhost:5432/minicord',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173'
};
