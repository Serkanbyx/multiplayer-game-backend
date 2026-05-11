import type { TypedServer, TypedSocket } from './index.js';
import * as roomService from '../services/roomService.js';
import * as matchmakingService from '../services/matchmakingService.js';
import { handleAbortOnLeave } from './gameHandlers.js';
import { DISCONNECT_GRACE_MS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

const socketRoomChannel = (roomCode: string) => `room:${roomCode}`;
const graceTimerKey = (roomCode: string, userId: string) => `${roomCode}:${userId}`;

/* ─── In-Memory Grace Timer Map ──────────────────────────────── */

const graceTimers = new Map<string, NodeJS.Timeout>();

export const cancelGraceTimer = (roomCode: string, userId: string): boolean => {
  const key = graceTimerKey(roomCode, userId);
  const timer = graceTimers.get(key);
  if (!timer) return false;

  clearTimeout(timer);
  graceTimers.delete(key);
  return true;
};

/**
 * Starts a grace timer. When it expires the user is treated as having
 * intentionally left the room (forfeit if game was in progress).
 */
const startGraceTimer = (io: TypedServer, roomCode: string, userId: string): void => {
  const key = graceTimerKey(roomCode, userId);

  // Safety: clear any pre-existing timer for this key
  if (graceTimers.has(key)) {
    clearTimeout(graceTimers.get(key)!);
  }

  const timer = setTimeout(async () => {
    graceTimers.delete(key);

    try {
      const room = await roomService.getRoom(roomCode);
      if (!room) return;

      const isStillDisconnected = room.players.some(
        (p) => p.userId === userId && !p.isConnected,
      );
      if (!isStillDisconnected) return;

      logger.info({ userId, roomCode }, 'Grace period expired');

      if (room.status === 'playing') {
        await handleAbortOnLeave(io, roomCode, userId);
      }

      const updatedRoom = await roomService.removePlayer(roomCode, userId);

      if (updatedRoom) {
        io.in(socketRoomChannel(roomCode)).emit('room:player-left', {
          playerId: userId,
          newHostId: updatedRoom.hostId,
        });
        io.in(socketRoomChannel(roomCode)).emit('room:updated', updatedRoom);
      }
    } catch (err) {
      logger.error({ err, roomCode, userId }, 'Error during grace period expiry cleanup');
    }
  }, DISCONNECT_GRACE_MS);

  graceTimers.set(key, timer);
};

/* ─── Handler Registration ───────────────────────────────────── */

export const registerDisconnectHandlers = (io: TypedServer, socket: TypedSocket): void => {
  socket.on('disconnect', async (reason) => {
    const { user, logger: log } = socket.data;
    log.warn({ reason }, 'Socket disconnected');

    try {
      const roomCode = await roomService.getUserRoom(user._id);

      if (!roomCode) {
        await matchmakingService.cleanupOnDisconnect(user._id);
        return;
      }

      const room = await roomService.getRoom(roomCode);
      if (!room) return;

      const isPlayer = room.players.some((p) => p.userId === user._id);
      const isSpectator = room.spectators.some((s) => s.userId === user._id);

      if (isPlayer) {
        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          players: current.players.map((p) =>
            p.userId === user._id ? { ...p, isConnected: false } : p,
          ),
        }));

        const freshRoom = await roomService.getRoom(roomCode);
        if (freshRoom) {
          io.in(socketRoomChannel(roomCode)).emit('room:updated', freshRoom);
        }

        startGraceTimer(io, roomCode, user._id);
      } else if (isSpectator) {
        await roomService.removeSpectator(roomCode, user._id);
      }
    } catch (err) {
      log.error({ err }, 'Error during disconnect handling');
    }
  });
};
