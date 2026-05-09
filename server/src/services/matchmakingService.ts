import { redis } from "../config/redis.js";
import { GameFactory } from "../games/GameFactory.js";
import { MATCHMAKING_TTL_SECONDS } from "../utils/constants.js";
import * as roomService from "./roomService.js";
import { getIo } from "../socket/io.js";
import type { GameType } from "../../../shared/types/games.js";
import type { AuthUser } from "../../../shared/types/auth.js";
import type { RoomPlayer } from "../../../shared/types/room.js";

/* ─── Redis Key Helpers ──────────────────────────────────────── */

const queueKey = (gameType: string) => `mm:${gameType}`;
const lockKey = (userId: string) => `mm:lock:${userId}`;

/* ─── Queue Entry ────────────────────────────────────────────── */

interface QueueEntry {
  userId: string;
  displayName: string;
  isGuest: boolean;
  avatarUrl: string | null;
  queuedAt: number;
}

/* ─── Join Queue ─────────────────────────────────────────────── */

export const joinQueue = async ({
  user,
  gameType,
}: {
  user: AuthUser;
  gameType: GameType;
}): Promise<{ position: number }> => {
  const existingRoom = await roomService.getUserRoom(user._id);
  if (existingRoom) {
    throw new Error("ALREADY_IN_ROOM");
  }

  const alreadyQueued = await redis.get(lockKey(user._id));
  if (alreadyQueued) {
    throw new Error("ALREADY_QUEUED");
  }

  const entry: QueueEntry = {
    userId: user._id,
    displayName: user.displayName,
    isGuest: user.isGuest,
    avatarUrl: user.avatarUrl ?? null,
    queuedAt: Date.now(),
  };

  const pipeline = redis.pipeline();
  pipeline.rpush(queueKey(gameType), JSON.stringify(entry));
  pipeline.set(lockKey(user._id), gameType, "EX", MATCHMAKING_TTL_SECONDS);
  await pipeline.exec();

  const position = await redis.llen(queueKey(gameType));

  await tryMatch(gameType);

  return { position };
};

/* ─── Cancel Queue ───────────────────────────────────────────── */

export const cancelQueue = async ({
  user,
  gameType,
}: {
  user: AuthUser;
  gameType: GameType;
}): Promise<void> => {
  const entries = await redis.lrange(queueKey(gameType), 0, -1);

  for (const raw of entries) {
    const entry = JSON.parse(raw) as QueueEntry;
    if (entry.userId === user._id) {
      await redis.lrem(queueKey(gameType), 1, raw);
      break;
    }
  }

  await redis.del(lockKey(user._id));
};

/* ─── Try Match ──────────────────────────────────────────────── */

const tryMatch = async (gameType: GameType): Promise<void> => {
  const config = GameFactory.getConfig(gameType);
  const key = queueKey(gameType);
  const io = getIo();

  while (true) {
    const queueLength = await redis.llen(key);
    if (queueLength < config.maxPlayers) break;

    const validEntries: QueueEntry[] = [];

    while (validEntries.length < config.maxPlayers) {
      const raw = await redis.lpop(key);
      if (!raw) break;

      const entry = JSON.parse(raw) as QueueEntry;

      const lockExists = await redis.get(lockKey(entry.userId));
      if (!lockExists) continue;

      const userRoom = await roomService.getUserRoom(entry.userId);
      if (userRoom) {
        await redis.del(lockKey(entry.userId));
        continue;
      }

      const userSockets = await io.in(`user:${entry.userId}`).fetchSockets();
      if (userSockets.length === 0) {
        await redis.del(lockKey(entry.userId));
        continue;
      }

      validEntries.push(entry);
    }

    if (validEntries.length < config.maxPlayers) {
      // Not enough valid players — push remaining back to queue front
      for (let i = validEntries.length - 1; i >= 0; i--) {
        await redis.lpush(key, JSON.stringify(validEntries[i]));
      }
      break;
    }

    // All entries valid — create room and pair players
    const host = validEntries[0]!;
    const hostPlayer: RoomPlayer = {
      userId: host.userId,
      displayName: host.displayName,
      isGuest: host.isGuest,
      avatarUrl: host.avatarUrl,
      position: 0,
      isConnected: true,
    };

    const room = await roomService.createRoom({
      host: hostPlayer,
      gameType,
      isPrivate: false,
      maxPlayers: config.maxPlayers,
    });

    // Add remaining players
    for (let i = 1; i < validEntries.length; i++) {
      const entry = validEntries[i]!;
      const player: RoomPlayer = {
        userId: entry.userId,
        displayName: entry.displayName,
        isGuest: entry.isGuest,
        avatarUrl: entry.avatarUrl,
        position: i,
        isConnected: true,
      };
      await roomService.addPlayer(room.roomCode, player);
    }

    // Notify all matched players and join them to room channel
    for (const entry of validEntries) {
      await redis.del(lockKey(entry.userId));

      const sockets = await io.in(`user:${entry.userId}`).fetchSockets();
      for (const s of sockets) {
        s.join(`room:${room.roomCode}`);
        s.emit("matchmaking:found", { roomCode: room.roomCode });
      }
    }
  }
};

/* ─── Cleanup on Disconnect ──────────────────────────────────── */

export const cleanupOnDisconnect = async (userId: string): Promise<void> => {
  const lockedGameType = await redis.get(lockKey(userId));
  if (!lockedGameType) return;

  const entries = await redis.lrange(queueKey(lockedGameType), 0, -1);

  for (const raw of entries) {
    const entry = JSON.parse(raw) as QueueEntry;
    if (entry.userId === userId) {
      await redis.lrem(queueKey(lockedGameType), 1, raw);
      break;
    }
  }

  await redis.del(lockKey(userId));
};
