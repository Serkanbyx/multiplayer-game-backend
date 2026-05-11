import type { Request, Response, NextFunction } from 'express';
import { eq, desc, sql, and, or, ilike, count as drizzleCount } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, usersPublicSelect, matches } from '../db/schema/index.js';
import { deleteUserById } from '../services/userService.js';
import { redis } from '../config/redis.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { escapeLike } from '../utils/escapeRegex.js';
import type { GameType } from '@mpg/shared/types/games.js';
import type { MatchRecord } from '@mpg/shared/types/match.js';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/* ------------------------------------------------------------------ */
/*  GET /api/admin/stats — Dashboard statistics                        */
/* ------------------------------------------------------------------ */

export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [
      [usersCount],
      [adminsCount],
      [matchesCount],
      matchesByGameType,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, 'admin')),
      db.select({ count: sql<number>`count(*)::int` }).from(matches),
      db
        .select({
          gameType: matches.gameType,
          count: sql<number>`count(*)::int`,
        })
        .from(matches)
        .groupBy(matches.gameType),
    ]);

    let activeRoomsCount = 0;
    let queueSize = 0;

    try {
      const roomKeys = await scanRedisKeys('room:*');
      activeRoomsCount = roomKeys.length;

      const queueKeys = await scanRedisKeys('queue:*');
      queueSize = 0;
      for (const key of queueKeys) {
        const len = await redis.llen(key);
        queueSize += len;
      }
    } catch {
      /* Redis unavailable — return zeros */
    }

    sendSuccess(res, {
      totalUsers: usersCount?.count ?? 0,
      totalAdmins: adminsCount?.count ?? 0,
      totalMatches: matchesCount?.count ?? 0,
      matchesByGameType: matchesByGameType.reduce(
        (acc, row) => {
          acc[row.gameType] = row.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      activeRoomsCount,
      queueSize,
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/admin/users — Paginated user list with search & filter    */
/* ------------------------------------------------------------------ */

export const getUsers = async (
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
    const search = (req.query.search as string | undefined)?.trim();
    const roleFilter = req.query.role as 'player' | 'admin' | undefined;

    const conditions = [];

    if (search) {
      const escaped = escapeLike(search);
      const pattern = `%${escaped}%`;
      conditions.push(
        or(
          ilike(users.username, pattern),
          ilike(users.email, pattern),
          ilike(users.displayName, pattern),
        )!,
      );
    }

    if (roleFilter) {
      conditions.push(eq(users.role, roleFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select(usersPublicSelect)
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);

    const total = totalRows[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    sendSuccess(res, {
      users: rows,
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

/* ------------------------------------------------------------------ */
/*  GET /api/admin/users/:id — Full user record (without password)     */
/* ------------------------------------------------------------------ */

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.params.id as string;

    const [user] = await db
      .select(usersPublicSelect)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

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
/*  PATCH /api/admin/users/:id/role — Update user role                 */
/* ------------------------------------------------------------------ */

export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const targetId = req.params.id as string;
    const { role } = req.body as { role: 'player' | 'admin' };

    if (targetId === req.user!._id) {
      sendError(res, 'Cannot change your own role', 403);
      return;
    }

    const [targetUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);

    if (!targetUser) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (targetUser.role === 'admin' && role === 'player') {
      const [adminCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, 'admin'));

      if ((adminCount?.count ?? 0) <= 1) {
        sendError(res, 'Cannot demote the only admin', 400);
        return;
      }
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, targetId))
      .returning(usersPublicSelect);

    sendSuccess(res, { user: updated }, 'User role updated');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/users/:id — Delete user                          */
/* ------------------------------------------------------------------ */

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const targetId = req.params.id as string;

    if (targetId === req.user!._id) {
      sendError(res, 'Cannot delete your own account', 403);
      return;
    }

    const [targetUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);

    if (!targetUser) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (targetUser.role === 'admin') {
      const [adminCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, 'admin'));

      if ((adminCount?.count ?? 0) <= 1) {
        sendError(res, 'Cannot delete the only admin', 400);
        return;
      }
    }

    await deleteUserById(targetId);

    sendSuccess(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/admin/rooms — List active rooms from Redis                */
/* ------------------------------------------------------------------ */

export const getActiveRooms = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const keys = await scanRedisKeys('room:*');

    const rooms = [];
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (!data) continue;

        const room = JSON.parse(data) as {
          roomCode?: string;
          gameType?: string;
          status?: string;
          players?: unknown[];
          createdAt?: string;
        };

        rooms.push({
          roomCode: room.roomCode ?? key.replace('room:', ''),
          gameType: room.gameType ?? 'unknown',
          status: room.status ?? 'unknown',
          playerCount: room.players?.length ?? 0,
          createdAt: room.createdAt ?? null,
        });
      } catch {
        /* Skip malformed entries */
      }
    }

    sendSuccess(res, { rooms });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE /api/admin/rooms/:roomCode — Force close a room             */
/* ------------------------------------------------------------------ */

export const forceCloseRoom = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const roomCode = req.params.roomCode as string;
    const redisKey = `room:${roomCode}`;

    const exists = await redis.exists(redisKey);
    if (!exists) {
      sendError(res, 'Room not found', 404);
      return;
    }

    try {
      const { getIo } = await import('../socket/io.js');
      const io = getIo();
      if (io) {
        io.to(roomCode).emit('room:closed');
        const sockets = await io.in(roomCode).fetchSockets();
        for (const socket of sockets) {
          socket.leave(roomCode);
        }
      }
    } catch {
      /* Socket.io not initialized yet — skip emit */
    }

    await redis.del(redisKey);

    sendSuccess(res, null, 'Room closed');
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/admin/matches — Recent matches (no privacy filtering)     */
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

    const toRecord = (row: typeof matches.$inferSelect): MatchRecord => ({
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

    sendSuccess(res, {
      matches: rows.map(toRecord),
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

/* ------------------------------------------------------------------ */
/*  Helper: SCAN Redis keys with a pattern                             */
/* ------------------------------------------------------------------ */

async function scanRedisKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, batch] = await redis.scan(
      Number(cursor),
      'MATCH',
      pattern,
      'COUNT',
      100,
    );
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}
