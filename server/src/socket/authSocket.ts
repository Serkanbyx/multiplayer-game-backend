import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { JwtPayload } from '@mpg/shared/types/auth.js';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { childLogger } from '../utils/logger.js';
import type { TypedSocket } from './index.js';

/**
 * Socket.io handshake middleware — verifies JWT and populates `socket.data.user`.
 * Token sources (priority order):
 *   1. `socket.handshake.auth.token`
 *   2. `Authorization: Bearer <token>` header
 */
export const authSocket = async (
  socket: TypedSocket,
  next: (err?: Error) => void,
): Promise<void> => {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    if (decoded.isGuest) {
      socket.data.user = {
        _id: decoded.id,
        displayName: decoded.displayName,
        role: 'player',
        isGuest: true,
      };
    } else {
      const [row] = await db
        .select({
          id: users.id,
          role: users.role,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);

      if (!row) {
        return next(new Error('UNAUTHORIZED'));
      }

      socket.data.user = {
        _id: row.id,
        displayName: row.displayName,
        role: row.role,
        isGuest: false,
        ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
      };
    }

    socket.data.logger = childLogger({ socketId: socket.id, userId: socket.data.user._id });
    socket.join(`user:${socket.data.user._id}`);
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
};
