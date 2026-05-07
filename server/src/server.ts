import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { sql } from 'drizzle-orm';

import { env } from './config/env.js';
import { corsOptions } from './config/corsOptions.js';
import { db, dbClient } from './db/index.js';
import { redis } from './config/redis.js';
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import matchRouter from './routes/matchRoutes.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(cors(corsOptions));

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

app.use(errorHandler);

const httpServer = http.createServer(app);

const bootstrap = async (): Promise<void> => {
  // Verify DB reachability at startup; fail fast if Postgres is unreachable.
  await db.execute(sql`SELECT 1`);
  console.log('Postgres connection verified');

  httpServer.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  try {
    await dbClient.end({ timeout: 5 });
    redis.disconnect();
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, httpServer };
