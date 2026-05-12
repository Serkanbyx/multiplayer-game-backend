import 'dotenv/config';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { Server } from 'socket.io';
import { sql } from 'drizzle-orm';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { corsOptions } from './config/corsOptions.js';
import { db, dbClient } from './db/index.js';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerSpec } from './config/swagger.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import matchRouter from './routes/matchRoutes.js';
import leaderboardRouter from './routes/leaderboardRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import type { ClientToServerEvents, ServerToClientEvents } from '@mpg/shared/types/events.js';
import { registerSocketHandlers } from './socket/index.js';
import { setIo } from './socket/io.js';

const { version } = JSON.parse(
  readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
) as { version: string };

const app = express();

app.disable('x-powered-by');

app.set('trust proxy', 1);

app.use(helmet());

app.use(compression());

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MPG API Documentation',
}));

app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Multiplayer Game Backend</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  font-family:'Segoe UI',system-ui,-apple-system,sans-serif;
  background:#0a0a1a;color:#e0e0f0;overflow:hidden;
}
body::before{
  content:'';position:fixed;inset:0;z-index:0;
  background:
    radial-gradient(ellipse 600px 600px at 20% 30%,rgba(124,58,237,.15),transparent),
    radial-gradient(ellipse 500px 500px at 80% 70%,rgba(6,182,212,.12),transparent),
    radial-gradient(ellipse 400px 400px at 50% 50%,rgba(16,185,129,.08),transparent);
}
body::after{
  content:'';position:fixed;inset:0;z-index:0;
  background-image:
    repeating-linear-gradient(0deg,transparent,transparent 49px,rgba(124,58,237,.06) 49px,rgba(124,58,237,.06) 50px),
    repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(124,58,237,.06) 49px,rgba(124,58,237,.06) 50px);
}
.container{
  position:relative;z-index:1;text-align:center;padding:3rem 2rem;
  background:rgba(15,15,35,.85);border:1px solid rgba(124,58,237,.3);
  border-radius:24px;backdrop-filter:blur(20px);
  box-shadow:0 0 60px rgba(124,58,237,.15),inset 0 1px 0 rgba(255,255,255,.05);
  max-width:520px;width:90%;
}
.icon{
  font-size:3rem;margin-bottom:1rem;
  filter:drop-shadow(0 0 20px rgba(124,58,237,.6));
  animation:float 3s ease-in-out infinite;
}
@keyframes float{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-10px)}
}
h1{
  font-size:2rem;font-weight:800;letter-spacing:-0.02em;
  background:linear-gradient(135deg,#7c3aed,#06b6d4,#10b981);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}
.version{
  display:inline-block;margin-top:.5rem;padding:.25rem .75rem;
  font-size:.8rem;font-weight:600;letter-spacing:.05em;
  color:#a78bfa;border:1px solid rgba(124,58,237,.4);border-radius:20px;
  background:rgba(124,58,237,.1);
}
.desc{
  margin-top:1.25rem;font-size:.95rem;color:#94a3b8;line-height:1.6;
}
.links{display:flex;gap:.75rem;justify-content:center;margin-top:2rem;flex-wrap:wrap}
.btn-primary,.btn-secondary{
  display:inline-flex;align-items:center;gap:.5rem;
  padding:.75rem 1.5rem;border-radius:12px;font-size:.9rem;font-weight:600;
  text-decoration:none;transition:all .3s ease;
}
.btn-primary{
  background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;
  box-shadow:0 4px 20px rgba(124,58,237,.4);
}
.btn-primary:hover{
  transform:translateY(-2px);
  box-shadow:0 6px 30px rgba(124,58,237,.6);
}
.btn-secondary{
  background:rgba(6,182,212,.1);color:#06b6d4;
  border:1px solid rgba(6,182,212,.3);
}
.btn-secondary:hover{
  background:rgba(6,182,212,.2);transform:translateY(-2px);
  box-shadow:0 4px 20px rgba(6,182,212,.2);
}
.sign{
  margin-top:2.5rem;padding-top:1.25rem;
  border-top:1px solid rgba(124,58,237,.15);
  font-size:.8rem;color:#64748b;
}
.sign a{color:#a78bfa;text-decoration:none;transition:color .2s}
.sign a:hover{color:#c4b5fd}
@media(max-width:480px){
  .container{padding:2rem 1.25rem}
  h1{font-size:1.5rem}
  .links{flex-direction:column;align-items:center}
}
</style>
</head>
<body>
<div class="container">
<div class="icon">&#127918;</div>
<h1>Multiplayer Game Backend</h1>
<p class="version">v${version}</p>
<p class="desc">Real-time multiplayer game platform with room management, matchmaking, spectators, chat, and leaderboard.</p>
<div class="links">
<a href="/api-docs" class="btn-primary">API Documentation</a>
<a href="/api/health" class="btn-secondary">Health Check</a>
</div>
<footer class="sign">
Created by
<a href="https://serkanbayraktar.com/" target="_blank" rel="noopener noreferrer">Serkanby</a>
|
<a href="https://github.com/Serkanbyx" target="_blank" rel="noopener noreferrer">Github</a>
</footer>
</div>
</body>
</html>`);
});

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
