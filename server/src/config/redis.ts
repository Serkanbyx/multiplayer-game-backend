import { Redis } from 'ioredis';
import { env } from './env.js';
import { childLogger } from '../utils/logger.js';

const createClient = (label: string): Redis => {
  const log = childLogger({ component: 'redis', instance: label });

  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  client.on('connect', () => log.info('Connecting'));
  client.on('ready', () => log.info('Ready'));
  client.on('error', (err: Error) => log.error({ err }, 'Connection error'));
  client.on('close', () => log.warn('Connection closed'));

  return client;
};

export const redis = createClient('default');
export const pub = redis.duplicate();
export const sub = redis.duplicate();
