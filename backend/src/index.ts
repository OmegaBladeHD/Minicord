import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { connectRedis } from './config/redis.js';
import { authRouter } from './routes/auth.js';
import { groupsRouter } from './routes/groups.js';
import { messagesRouter } from './routes/messages.js';
import { attachSocket } from './socket/index.js';

const app = express();
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

app.use(
  '/api/messages',
  rateLimit({
    windowMs: 5_000,
    max: 12,
    message: { error: 'Too many messages, slow down.' }
  })
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/messages', messagesRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.clientUrl }
});
attachSocket(io);

connectRedis()
  .then(() => {
    httpServer.listen(env.port, () => {
      console.log(`API listening on :${env.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
