import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { matches, users } from '../db/schema/index.js';
import {
  findPublicById,
  findPublicByUsername,
  updateProfileById,
} from '../services/userService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { PublicUser, UserPreferences } from '@mpg/shared/types/user.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const toIsoOrUndefined = (value: Date | null): string | undefined =>
  value ? value.toISOString() : undefined;

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

    const user = await findPublicByUsername(username);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const publicUser: PublicUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };

    if (user.preferences?.privacy?.showStats !== false) {
      publicUser.stats = user.stats;
      if (user.statsByGame && Object.keys(user.statsByGame).length > 0) {
        publicUser.statsByGame = user.statsByGame as Record<string, typeof user.stats>;
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
    const user = await findPublicById(req.user!._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }
    sendSuccess(res, { user });
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

    const user = await updateProfileById(req.user!._id, { displayName, bio });
    sendSuccess(res, { user }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  PATCH /api/users/me/preferences — Update own preferences           */
/* ------------------------------------------------------------------ */

const ALLOWED_TOP: Array<keyof UserPreferences> = [
  'theme', 'fontSize', 'animations', 'sounds', 'soundVolume', 'language',
];

export const updateMyPreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.id, req.user!._id))
        .limit(1);

      if (!row) {
        sendError(res, 'User not found', 404);
        return null;
      }

      const merged = { ...row.preferences } as Record<string, unknown>;

      for (const [key, value] of Object.entries(req.body)) {
        if (key === 'notifications' || key === 'privacy') {
          if (value && typeof value === 'object') {
            merged[key] = {
              ...(merged[key] as object),
              ...(value as object),
            };
          }
        } else if (ALLOWED_TOP.includes(key as keyof UserPreferences)) {
          merged[key] = value;
        }
      }

      const [updated] = await tx
        .update(users)
        .set({ preferences: merged as unknown as UserPreferences })
        .where(eq(users.id, req.user!._id))
        .returning({ preferences: users.preferences });

      return updated!.preferences;
    });

    if (result !== null) {
      sendSuccess(res, result, 'Preferences updated');
    }
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/users/:username/matches — User match history (public)     */
/* ------------------------------------------------------------------ */

export const getUserMatches = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const username = req.params.username as string;

    const user = await findPublicByUsername(username);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT),
    );
    const offset = (page - 1) * limit;

    const containsClause = sql`${matches.players} @> ${JSON.stringify([{ userId: user.id }])}::jsonb`;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(matches)
        .where(containsClause)
        .orderBy(desc(matches.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(matches)
        .where(containsClause),
    ]);

    const total = totalRows[0]?.count ?? 0;

    sendSuccess(res, {
      matches: rows.map((m) => ({
        id: m.id,
        roomCode: m.roomCode,
        gameType: m.gameType,
        players: m.players,
        result: m.result,
        duration: m.duration,
        totalRounds: m.totalRounds,
        startedAt: m.startedAt.toISOString(),
        endedAt: m.endedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

    void toIsoOrUndefined;
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/users/me/avatar — Upload avatar                          */
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

    const current = await findPublicById(req.user!._id);
    if (!current) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (current.avatarUrl) {
      const oldPath = path.join(process.cwd(), current.avatarUrl);
      await deleteFileIfExists(oldPath);
    }

    const newAvatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updated = await updateProfileById(req.user!._id, {
      avatarUrl: newAvatarUrl,
    });

    sendSuccess(res, { avatarUrl: updated.avatarUrl }, 'Avatar uploaded');
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
    const current = await findPublicById(req.user!._id);
    if (!current) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (current.avatarUrl) {
      const filePath = path.join(process.cwd(), current.avatarUrl);
      await deleteFileIfExists(filePath);
    }

    await updateProfileById(req.user!._id, { avatarUrl: '' });
    sendSuccess(res, null, 'Avatar removed');
  } catch (err) {
    next(err);
  }
};
