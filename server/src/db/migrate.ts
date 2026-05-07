import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env.js';

const main = async (): Promise<void> => {
  const client = postgres(env.DATABASE_URL, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
    console.log('Migrations applied successfully');
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
