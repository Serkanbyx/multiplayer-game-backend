import type { Request, Response, NextFunction } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 6;

const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      out[key] = sanitize(val, depth + 1);
    }
    return out;
  }
  return value;
};

/**
 * Lightweight body/params sanitizer.
 * - Strips `__proto__`, `constructor`, and `prototype` keys (prototype-pollution).
 * - Clamps object depth to {@link MAX_DEPTH} (DoS protection on deeply-nested payloads).
 *
 * SQL injection is structurally prevented by Drizzle + postgres-js parameterized queries,
 * so we do NOT need the legacy `express-mongo-sanitize` package here.
 */
export const sanitizeMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.params) {
    req.params = sanitize(req.params) as typeof req.params;
  }
  next();
};
