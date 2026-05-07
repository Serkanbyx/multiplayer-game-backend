import type { Request, Response, NextFunction } from 'express';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { matches } from '../db/schema/index.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { MatchRecord } from '@mpg/shared/types/match.js';
import type { GameType } from '@mpg/shared/types/games.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const toMatchRecord = (row: typeof matches.$inferSelect): MatchRecord => ({
  id: row.id,
  roomCode: row.roomCode,
  gameType: row.gameType,
  players: row.players,
  result: row.result,
  moves: row.moves,
  winnerUserId: row.winnerUserId,
  duration: row.duration,
  totalRounds: row.totalRounds,
  startedAt: row.startedAt.toISOString(),
  endedAt: row.endedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
});

/* ------------------------------------------------------------------ */
/*  GET /api/matches/:id — Single match detail (public)                */
/* ------------------------------------------------------------------ */

export const getMatchById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const matchId = req.params.id as string;

    const [row] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!row) {
      sendError(res, 'Match not found', 404);
      return;
    }

    sendSuccess(res, { match: toMatchRecord(row) });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/matches — Recent matches with pagination & gameType filter*/
/* ------------------------------------------------------------------ */

export const getRecentMatches = async (
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

    const whereClause = gameType
      ? eq(matches.gameType, gameType)
      : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(matches)
        .where(whereClause)
        .orderBy(desc(matches.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(matches)
        .where(whereClause),
    ]);

    const total = totalRows[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      matches: rows.map(toMatchRecord),
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
