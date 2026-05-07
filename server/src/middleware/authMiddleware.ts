import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { sendError } from '../utils/apiResponse.js';
import type { JwtPayload, AuthUser } from '@mpg/shared/types/auth.js';

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
};

const resolveUser = async (decoded: JwtPayload): Promise<AuthUser | null> => {
  if (decoded.isGuest) {
    return {
      _id: decoded.id,
      displayName: decoded.displayName,
      role: 'player',
      isGuest: true,
    };
  }

  const [user] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, decoded.id))
    .limit(1);

  if (!user) return null;

  return {
    _id: user.id,
    displayName: user.displayName,
    role: user.role,
    isGuest: false,
    avatarUrl: user.avatarUrl,
  };
};

/**
 * Verifies token and attaches user to req.user.
 * Missing or invalid token → 401.
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractToken(req);
  if (!token) {
    sendError(res, 'Not authenticated', 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const authUser = await resolveUser(decoded);
    if (!authUser) {
      sendError(res, 'Not authenticated', 401);
      return;
    }
    req.user = authUser;
    next();
  } catch {
    sendError(res, 'Not authenticated', 401);
  }
};

/**
 * Verifies token if present; silently passes through otherwise.
 * Leaves req.user undefined on any failure.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const authUser = await resolveUser(decoded);
    if (authUser) {
      req.user = authUser;
    }
  } catch {
    /* Invalid token — fall through anonymously */
  }

  next();
};

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== 'admin') {
    sendError(res, 'Forbidden — admin access required', 403);
    return;
  }
  next();
};

export const registeredOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.isGuest) {
    sendError(res, 'Forbidden — registered account required', 403);
    return;
  }
  next();
};
