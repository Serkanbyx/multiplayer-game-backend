import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const seedAdmin = async (): Promise<void> => {
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD in env');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    existing.username = ADMIN_USERNAME;
    existing.role = 'admin';
    existing.displayName = ADMIN_USERNAME;
    existing.password = ADMIN_PASSWORD;
    await existing.save();
    console.log(`Admin user "${ADMIN_USERNAME}" updated`);
  } else {
    await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_USERNAME,
      role: 'admin',
    });
    console.log(`Admin user "${ADMIN_USERNAME}" created`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
