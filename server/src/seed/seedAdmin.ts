import 'dotenv/config';
import { dbClient } from '../db/index.js';
import { upsertAdmin } from '../services/userService.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const main = async (): Promise<void> => {
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD in env');
    process.exit(1);
  }

  await upsertAdmin({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: ADMIN_USERNAME,
    role: 'admin',
  });

  console.log(`Admin user "${ADMIN_USERNAME}" upserted`);
  await dbClient.end();
  process.exit(0);
};

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
