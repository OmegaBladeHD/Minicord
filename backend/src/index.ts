import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { HTTP_STATUS } from './constants/httpStatus.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { connectRedis, redis } from './config/redis.js';
import { authRouter } from './routes/auth.js';
import { groupsRouter } from './routes/groups.js';
import { messagesRouter } from './routes/messages.js';
import { uploadRouter } from './routes/upload.js';
import { usersRouter } from './routes/users.js';
import { logger } from './services/logger.js';
import { attachSocket } from './socket/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

app.use(
  rateLimit({
    windowMs: 10_000,
    max: 80,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' }
  })
);

app.get('/health', async (_req, res) => {
  const startedAt = Date.now();
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    return res.json({ status: 'ok', postgres: 'ok', redis: 'ok', latencyMs: Date.now() - startedAt });
  } catch (error) {
    logger.error({ error }, 'healthcheck failed');
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ status: 'degraded' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/users', usersRouter);
app.use('/api/upload', uploadRouter);
app.use(errorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.clientUrl }
});
attachSocket(io);

connectRedis()
  .then(() => {
    httpServer.listen(env.port, () => {
      logger.info({ port: env.port }, 'API listening');
    });
  })
  .catch((error) => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });
