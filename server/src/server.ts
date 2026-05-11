import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { Server } from 'socket.io';
import { sql } from 'drizzle-orm';

import { env } from './config/env.js';
import { corsOptions } from './config/corsOptions.js';
import { db, dbClient } from './db/index.js';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import matchRouter from './routes/matchRoutes.js';
import leaderboardRouter from './routes/leaderboardRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@mpg/shared/types/events.js';
import { registerSocketHandlers } from './socket/index.js';
import { setIo } from './socket/io.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(cors(corsOptions));

app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => (req as { url?: string }).url === '/api/health' } }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeMiddleware);

app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: '7d',
    dotfiles: 'deny',
    index: false,
  }),
);

app.use('/api', globalLimiter);

app.get('/api/health', async (_req, res) => {
  let dbReady = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbReady = true;
  } catch {
    dbReady = false;
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: dbReady,
    redis: redis.status === 'ready',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/matches', matchRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: corsOptions,
  pingTimeout: 20_000,
  pingInterval: 25_000,
  maxHttpBufferSize: 1e5,
});

setIo(io);
registerSocketHandlers(io);

const bootstrap = async (): Promise<void> => {
  await db.execute(sql`SELECT 1`);
  logger.info('Postgres connection verified');

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  try {
    await dbClient.end({ timeout: 5 });
    redis.disconnect();
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
  }
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

if (env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  });
}

export { app, httpServer, io };
