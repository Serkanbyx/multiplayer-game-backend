import pino from 'pino';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l' },
        },
      }),
  redact: {
    paths: [
      'password',
      '*.password',
      'token',
      '*.token',
      'authorization',
      'req.headers.authorization',
      'req.body.password',
    ],
    remove: true,
  },
  base: { service: 'multiplayer-game-backend' },
});

export const childLogger = (bindings: Record<string, unknown>) =>
  logger.child(bindings);
