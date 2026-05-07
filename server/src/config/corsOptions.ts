import type { CorsOptions } from 'cors';
import { env } from './env.js';

/**
 * Vercel preview deployments are served from unique `*.vercel.app` subdomains
 * (one per PR / branch). To allow them through CORS without weakening
 * production rules, we accept the exact `CLIENT_ORIGIN` plus — only outside
 * production — any `*.vercel.app` host. Same-origin / server-to-server calls
 * (which arrive without an `Origin` header) are also allowed.
 *
 * The same allowlist is reused by Socket.io (`new Server(httpServer, { cors })`)
 * to keep one source of truth for cross-origin policy.
 */

const VERCEL_PREVIEW_HOST = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const isAllowedOrigin = (origin: string): boolean => {
  if (origin === env.CLIENT_ORIGIN) {
    return true;
  }
  if (env.NODE_ENV !== 'production' && VERCEL_PREVIEW_HOST.test(origin)) {
    return true;
  }
  return false;
};

type OriginCallback = (err: Error | null, allow?: boolean) => void;

export const corsOriginCheck = (
  origin: string | undefined,
  callback: OriginCallback,
): void => {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

export const corsOptions: CorsOptions = {
  origin: corsOriginCheck,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
};
