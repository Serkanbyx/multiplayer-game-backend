import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const main = async (): Promise<void> => {
  const client = postgres(env.DATABASE_URL, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
    logger.info('Migrations applied successfully');
  } finally {
    await client.end();
  }
};

main().catch((err) => {
  logger.fatal({ err }, 'Migration failed');
  process.exit(1);
});
