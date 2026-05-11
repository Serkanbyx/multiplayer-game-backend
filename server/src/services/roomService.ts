import { redis } from "../config/redis.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import {
  ROOM_TTL_SECONDS,
  MAX_CHAT_MESSAGES,
  MAX_SPECTATORS,
} from "../utils/constants.js";
import type {
  Room,
  RoomPlayer,
  RoomSpectator,
  ChatMessage,
} from "../../../shared/types/room.js";
import type { GameType, GameState } from "../../../shared/types/games.js";

/* ─── Redis Key Helpers ──────────────────────────────────────── */

const roomKey = (code: string) => `room:${code}`;
const roomIndexKey = "room:index";
const userRoomKey = (userId: string) => `user:room:${userId}`;

/* ─── Core CRUD ──────────────────────────────────────────────── */

interface CreateRoomParams {
  host: RoomPlayer;
  gameType: GameType;
  isPrivate: boolean;
  maxPlayers?: number;
}

export const createRoom = async ({
  host,
  gameType,
  isPrivate,
  maxPlayers = 2,
}: CreateRoomParams): Promise<Room> => {
  const roomCode = generateRoomCode();

  const room: Room = {
    roomCode,
    gameType,
    isPrivate,
    status: "waiting",
    hostId: host.userId,
    maxPlayers,
    players: [host],
    spectators: [],
    gameState: null,
    chat: [],
    rematchVotes: [],
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
  };

  const json = JSON.stringify(room);

  const pipeline = redis.pipeline();
  pipeline.set(roomKey(roomCode), json, "EX", ROOM_TTL_SECONDS);
  pipeline.sadd(roomIndexKey, roomCode);
  pipeline.set(userRoomKey(host.userId), roomCode, "EX", ROOM_TTL_SECONDS);
  await pipeline.exec();

  return room;
};

export const getRoom = async (roomCode: string): Promise<Room | null> => {
  const data = await redis.get(roomKey(roomCode));
  if (!data) return null;
  return JSON.parse(data) as Room;
};

/**
 * Optimistic concurrency ile room günceller.
 * WATCH/MULTI/EXEC kullanarak race condition'ları önler.
 * Mutator saf bir fonksiyondur — mevcut room'u alır, yeni room döner.
 */
export const updateRoom = async (
  roomCode: string,
  mutator: (room: Room) => Room
): Promise<Room> => {
  const key = roomKey(roomCode);
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await redis.unwatch();
    await redis.watch(key);

    const data = await redis.get(key);
    if (!data) {
      await redis.unwatch();
      throw new Error("ROOM_NOT_FOUND");
    }

    const current = JSON.parse(data) as Room;
    const updated = mutator(current);
    const json = JSON.stringify(updated);

    const multi = redis.multi();
    multi.set(key, json, "EX", ROOM_TTL_SECONDS);

    const result = await multi.exec();

    if (result) return updated;
  }

  await redis.unwatch();
  throw new Error("ROOM_UPDATE_CONFLICT");
};

export const deleteRoom = async (roomCode: string): Promise<void> => {
  const room = await getRoom(roomCode);
  if (!room) return;

  const pipeline = redis.pipeline();
  pipeline.del(roomKey(roomCode));
  pipeline.srem(roomIndexKey, roomCode);

  for (const player of room.players) {
    pipeline.del(userRoomKey(player.userId));
  }
  for (const spectator of room.spectators) {
    pipeline.del(userRoomKey(spectator.userId));
  }

  await pipeline.exec();
};

/* ─── Player Management ──────────────────────────────────────── */

export const addPlayer = async (
  roomCode: string,
  player: RoomPlayer
): Promise<Room> => {
  const room = await updateRoom(roomCode, (current) => {
    if (current.status === "playing") {
      throw new Error("GAME_IN_PROGRESS");
    }
    if (current.players.length >= current.maxPlayers) {
      throw new Error("ROOM_FULL");
    }
    if (current.players.some((p) => p.userId === player.userId)) {
      throw new Error("ALREADY_IN_ROOM");
    }

    const newPlayer: RoomPlayer = {
      ...player,
      position: current.players.length,
    };

    return { ...current, players: [...current.players, newPlayer] };
  });

  await redis.set(userRoomKey(player.userId), roomCode, "EX", ROOM_TTL_SECONDS);
  return room;
};

export const removePlayer = async (
  roomCode: string,
  userId: string
): Promise<Room | null> => {
  await redis.del(userRoomKey(userId));

  const currentRoom = await getRoom(roomCode);
  if (!currentRoom) return null;

  const remainingPlayers = currentRoom.players.filter(
    (p) => p.userId !== userId
  );

  // Oda boşaldıysa sil
  if (remainingPlayers.length === 0) {
    await deleteRoom(roomCode);
    return null;
  }

  const room = await updateRoom(roomCode, (current) => {
    const filtered = current.players.filter((p) => p.userId !== userId);

    // Pozisyonları yeniden hesapla
    const reindexed = filtered.map((p, i) => ({ ...p, position: i }));

    // Host ayrıldıysa sonraki oyuncuya transfer et
    const newHostId =
      current.hostId === userId ? reindexed[0]!.userId : current.hostId;

    return { ...current, players: reindexed, hostId: newHostId };
  });

  return room;
};

/* ─── Spectator Management ───────────────────────────────────── */

export const addSpectator = async (
  roomCode: string,
  user: RoomSpectator
): Promise<Room> => {
  const room = await updateRoom(roomCode, (current) => {
    if (current.spectators.length >= MAX_SPECTATORS) {
      throw new Error("SPECTATORS_FULL");
    }
    if (current.spectators.some((s) => s.userId === user.userId)) {
      return current;
    }
    return { ...current, spectators: [...current.spectators, user] };
  });

  await redis.set(userRoomKey(user.userId), roomCode, "EX", ROOM_TTL_SECONDS);
  return room;
};

export const removeSpectator = async (
  roomCode: string,
  userId: string
): Promise<Room> => {
  await redis.del(userRoomKey(userId));

  return updateRoom(roomCode, (current) => ({
    ...current,
    spectators: current.spectators.filter((s) => s.userId !== userId),
  }));
};

/* ─── Game State ─────────────────────────────────────────────── */

export const setGameState = async (
  roomCode: string,
  gameState: GameState | null
): Promise<Room> => {
  return updateRoom(roomCode, (current) => ({ ...current, gameState }));
};

/* ─── Chat ───────────────────────────────────────────────────── */

export const appendChat = async (
  roomCode: string,
  message: ChatMessage
): Promise<Room> => {
  return updateRoom(roomCode, (current) => {
    const chat = [...current.chat, message];
    // En eski mesajları düşür, max 50 mesaj tut
    const trimmed = chat.length > MAX_CHAT_MESSAGES
      ? chat.slice(chat.length - MAX_CHAT_MESSAGES)
      : chat;
    return { ...current, chat: trimmed };
  });
};

/* ─── Listing ────────────────────────────────────────────────── */

export const listAllRooms = async (): Promise<Room[]> => {
  const codes = await redis.smembers(roomIndexKey);
  if (codes.length === 0) return [];

  const keys = codes.map((c) => roomKey(c));
  const results = await redis.mget(...keys);

  const rooms: Room[] = [];
  const expiredCodes: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const data = results[i];
    if (data) {
      rooms.push(JSON.parse(data) as Room);
    } else {
      expiredCodes.push(codes[i]!);
    }
  }

  // Stale index entry'lerini temizle
  if (expiredCodes.length > 0) {
    await redis.srem(roomIndexKey, ...expiredCodes);
  }

  return rooms;
};

/* ─── User Room Lookup ───────────────────────────────────────── */

export const getUserRoom = async (userId: string): Promise<string | null> => {
  return redis.get(userRoomKey(userId));
};
