/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration test setup — runs before every test suite.
 *
 * DB strategy (order of precedence):
 *   1. If `TEST_DATABASE_URL` env var is set → use it directly (CI / manual).
 *   2. Spin up a Testcontainers Postgres instance (requires Docker).
 *
 * Redis is always mocked in-memory via ioredis-mock.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-key-that-is-32-chars!';
process.env.CLIENT_ORIGIN = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.LOG_LEVEL = 'fatal';
process.env.DATABASE_URL = 'postgresql://placeholder:5432/placeholder';

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setTestContext, getTestContext } from './helpers/testContext.js';

vi.mock('ioredis', async () => {
  const RedisMock = (await import('ioredis-mock')).default;
  return { Redis: RedisMock, default: RedisMock };
});

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('pino-http', () => ({
  pinoHttp: () => (_req: any, _res: any, next: any) => next(),
}));

let pgContainer: any = null;
let setupDone = false;

beforeAll(async () => {
  if (setupDone) return;
  setupDone = true;

  let connectionUri: string;

  if (process.env.TEST_DATABASE_URL) {
    connectionUri = process.env.TEST_DATABASE_URL;
  } else {
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    connectionUri = pgContainer.getConnectionUri();
  }

  process.env.DATABASE_URL = connectionUri;

  const postgres = (await import('postgres')).default;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');

  const migrationClient = postgres(connectionUri, { max: 1, prepare: false });
  await migrate(drizzle(migrationClient), { migrationsFolder: 'drizzle' });
  await migrationClient.end();

  const { app, httpServer, io } = await import('../server.js');
  const dbMod = await import('../db/index.js');
  const redisMod = await import('../config/redis.js');

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
  });

  const address = httpServer.address() as { port: number };

  setTestContext({
    baseUrl: `http://localhost:${address.port}`,
    app,
    httpServer,
    io,
    db: dbMod.db,
    dbClient: dbMod.dbClient,
    redis: redisMod.redis,
  });
});

afterEach(async () => {
  if (!setupDone) return;

  try {
    const ctx = getTestContext();

    const sockets = await ctx.io.fetchSockets();
    for (const s of sockets) {
      s.disconnect(true);
    }

    await new Promise((r) => setTimeout(r, 300));

    /*
     * ioredis-mock bug: stale WATCH state leaks from updateRoom retry
     * loops, causing subsequent pipeline() calls to return null silently.
     * Calling unwatch() resets the connection state before the next test.
     */
    await ctx.redis.unwatch();
    await ctx.redis.flushall();

    const { sql } = await import('drizzle-orm');
    await ctx.db.execute(sql`TRUNCATE matches, users RESTART IDENTITY CASCADE`);
  } catch {
    /* ignore if context not ready */
  }
});

afterAll(async () => {
  if (!setupDone) return;

  try {
    const ctx = getTestContext();
    ctx.httpServer.close();
    await ctx.dbClient.end();
  } catch {
    /* best-effort */
  }

  if (pgContainer) {
    try {
      await pgContainer.stop();
    } catch {
      /* best-effort */
    }
  }
});
