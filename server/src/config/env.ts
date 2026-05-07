import 'dotenv/config';

type NodeEnv = 'development' | 'production' | 'test';

interface Env {
  NODE_ENV: NodeEnv;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  GUEST_JWT_EXPIRES_IN: string;
  CLIENT_ORIGIN: string;
  ROOM_TTL_SECONDS: number;
  MATCHMAKING_TTL_SECONDS: number;
  BCRYPT_SALT_ROUNDS: number;
  UPLOAD_MAX_BYTES: number;
}

const requiredString = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
};

const optionalString = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : fallback;
};

const toInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }
  return parsed;
};

const toPositiveInt = (key: string, fallback: number): number => {
  const value = toInt(key, fallback);
  if (value <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }
  return value;
};

const parseNodeEnv = (): NodeEnv => {
  const raw = optionalString('NODE_ENV', 'development');
  const allowed: NodeEnv[] = ['development', 'production', 'test'];
  if (!allowed.includes(raw as NodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${allowed.join(', ')}`);
  }
  return raw as NodeEnv;
};

const NODE_ENV = parseNodeEnv();
const JWT_SECRET = requiredString('JWT_SECRET');

if (NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

const BCRYPT_SALT_ROUNDS = toInt('BCRYPT_SALT_ROUNDS', 12);
if (BCRYPT_SALT_ROUNDS < 10) {
  throw new Error('BCRYPT_SALT_ROUNDS must be at least 10');
}

export const env: Env = {
  NODE_ENV,
  PORT: toPositiveInt('PORT', 5000),
  DATABASE_URL: requiredString('DATABASE_URL'),
  REDIS_URL: requiredString('REDIS_URL'),
  JWT_SECRET,
  JWT_EXPIRES_IN: optionalString('JWT_EXPIRES_IN', '7d'),
  GUEST_JWT_EXPIRES_IN: optionalString('GUEST_JWT_EXPIRES_IN', '2h'),
  CLIENT_ORIGIN: requiredString('CLIENT_ORIGIN'),
  ROOM_TTL_SECONDS: toInt('ROOM_TTL_SECONDS', 7200),
  MATCHMAKING_TTL_SECONDS: toInt('MATCHMAKING_TTL_SECONDS', 300),
  BCRYPT_SALT_ROUNDS,
  UPLOAD_MAX_BYTES: toInt('UPLOAD_MAX_BYTES', 5_242_880),
};
