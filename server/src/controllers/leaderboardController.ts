import type { Request, Response, NextFunction } from 'express';
import { sql, and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { sendSuccess } from '../utils/apiResponse.js';
import type { GameType } from '@mpg/shared/types/games.js';
import type { GameStats } from '@mpg/shared/types/user.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  stats: GameStats;
  gameStats?: GameStats;
}

/* ------------------------------------------------------------------ */
/*  GET /api/leaderboard                                               */
/* ------------------------------------------------------------------ */

export const getLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT),
    );
    const offset = (page - 1) * limit;
    const gameType = req.query.gameType as GameType | undefined;

    const privacyFilter = sql`(${users.preferences}->'privacy'->>'showOnLeaderboard')::boolean = true`;
    const notGuestFilter = eq(users.isGuest, false);

    const orderBy = gameType
      ? sql`(${users.statsByGame}->'${sql.raw(gameType)}'->>'wins')::int DESC NULLS LAST`
      : sql`(${users.stats}->>'wins')::int DESC`;

    const whereClause = and(notGuestFilter, privacyFilter);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          stats: users.stats,
          statsByGame: users.statsByGame,
        })
        .from(users)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);

    const total = totalRows[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const leaderboard: LeaderboardEntry[] = rows.map((row) => {
      const entry: LeaderboardEntry = {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        stats: row.stats,
      };

      if (gameType && row.statsByGame[gameType]) {
        entry.gameStats = row.statsByGame[gameType];
      }

      return entry;
    });

    sendSuccess(res, {
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};
