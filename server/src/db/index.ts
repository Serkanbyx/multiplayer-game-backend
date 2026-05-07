import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

const isProduction = env.NODE_ENV === 'production';

export const dbClient = postgres(env.DATABASE_URL, {
  max: isProduction ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(dbClient, {
  schema,
  logger: env.NODE_ENV === 'development',
});

export type Database = typeof db;
