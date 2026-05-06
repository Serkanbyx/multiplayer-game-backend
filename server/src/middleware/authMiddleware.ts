import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
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

  const user = await User.findById(decoded.id).select('displayName role avatarUrl').lean();
  if (!user) return null;

  return {
    _id: String(user._id),
    displayName: user.displayName,
    role: user.role,
    isGuest: false,
    avatarUrl: user.avatarUrl,
  };
};

/**
 * Token doğrular, req.user'a atar.
 * Geçersiz veya eksik token → 401.
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
 * Token varsa doğrular, yoksa sessizce geçer.
 * Hata durumunda req.user = undefined olarak bırakır.
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
    // Geçersiz token — sessizce geç
  }

  next();
};

/**
 * Admin rolü gerektirir. protect'ten sonra kullanılmalı.
 */
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

/**
 * Kayıtlı (guest olmayan) kullanıcı gerektirir. protect'ten sonra kullanılmalı.
 */
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
