import 'dotenv/config';
import { dbClient } from '../db/index.js';
import { upsertAdmin } from '../services/userService.js';
import { logger } from '../utils/logger.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const main = async (): Promise<void> => {
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    logger.fatal('Missing ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD in env');
    process.exit(1);
  }

  await upsertAdmin({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: ADMIN_USERNAME,
    role: 'admin',
  });

  logger.info({ username: ADMIN_USERNAME }, 'Admin user upserted');
  await dbClient.end();
  process.exit(0);
};

main().catch((err) => {
  logger.fatal({ err }, 'Seed failed');
  process.exit(1);
});
