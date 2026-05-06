import { Redis } from 'ioredis';
import { env } from './env.js';

const createClient = (label: string): Redis => {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  client.on('connect', () => console.log(`Redis [${label}]: connecting...`));
  client.on('ready', () => console.log(`Redis [${label}]: ready`));
  client.on('error', (err: Error) => console.error(`Redis [${label}] error:`, err.message));
  client.on('close', () => console.warn(`Redis [${label}]: connection closed`));

  return client;
};

export const redis = createClient('default');
export const pub = redis.duplicate();
export const sub = redis.duplicate();
