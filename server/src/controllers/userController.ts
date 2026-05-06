import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { PublicUser } from '@mpg/shared/types/user.js';

/* ------------------------------------------------------------------ */
/*  GET /api/users/:username — Public profile                          */
/* ------------------------------------------------------------------ */

export const getPublicProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const username = req.params.username as string;

    const user = await User.findOne({
      username: username.toLowerCase(),
    }).lean();

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const publicUser: PublicUser = {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };

    if (user.preferences?.privacy?.showStats !== false) {
      publicUser.stats = user.stats;

      const statsByGame: Record<string, typeof user.stats> = {};
      if (user.statsByGame instanceof Map) {
        user.statsByGame.forEach((val, key) => {
          statsByGame[key] = val;
        });
      } else if (user.statsByGame && typeof user.statsByGame === 'object') {
        Object.assign(statsByGame, user.statsByGame);
      }

      if (Object.keys(statsByGame).length > 0) {
        publicUser.statsByGame = statsByGame;
      }
    }

    sendSuccess(res, { user: publicUser });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/users/me — Own full profile                               */
/* ------------------------------------------------------------------ */

export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, { user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  PATCH /api/users/me — Update own profile (whitelist only)          */
/* ------------------------------------------------------------------ */

export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { displayName, bio } = req.body as {
      displayName?: string;
      bio?: string;
    };

    const user = await User.findById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    sendSuccess(res, { user: user.toJSON() }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/users/:username/matches — User match history (public)     */
/* ------------------------------------------------------------------ */

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export const getUserMatches = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const username = req.params.username as string;

    const user = await User.findOne({
      username: username.toLowerCase(),
    })
      .select('_id')
      .lean();

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const filter = { 'players.userId': String(user._id) };

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Match.countDocuments(filter),
    ]);

    sendSuccess(res, {
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/users/me/avatar — Upload avatar                         */
/* ------------------------------------------------------------------ */

const deleteFileIfExists = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch {
    /* file may not exist — ignore */
  }
};

export const uploadAvatarHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.avatarUrl) {
      const oldPath = path.join(process.cwd(), user.avatarUrl);
      await deleteFileIfExists(oldPath);
    }

    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    sendSuccess(res, { avatarUrl: user.avatarUrl }, 'Avatar uploaded');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE /api/users/me/avatar — Remove avatar                        */
/* ------------------------------------------------------------------ */

export const removeAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (user.avatarUrl) {
      const filePath = path.join(process.cwd(), user.avatarUrl);
      await deleteFileIfExists(filePath);
    }

    user.avatarUrl = '';
    await user.save();

    sendSuccess(res, null, 'Avatar removed');
  } catch (err) {
    next(err);
  }
};
