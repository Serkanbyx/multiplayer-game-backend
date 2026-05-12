import type { CorsOptions } from 'cors';
import { env } from './env.js';

/**
 * Accepts the exact `CLIENT_ORIGIN` plus any `*.vercel.app` subdomain
 * (Vercel preview deployments get unique subdomains per PR / branch).
 * Same-origin / server-to-server calls (no `Origin` header) are allowed.
 *
 * Reused by Socket.io (`new Server(httpServer, { cors })`) for one
 * source of truth.
 */

const VERCEL_PREVIEW_HOST = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const isAllowedOrigin = (origin: string): boolean => {
  if (origin === env.CLIENT_ORIGIN) {
    return true;
  }
  if (VERCEL_PREVIEW_HOST.test(origin)) {
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
