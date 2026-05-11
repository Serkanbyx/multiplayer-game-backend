import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Room, RoomPlayer, RoomSpectator } from '../../../../shared/types/room.js';
import { twoPlayers, fourPlayers } from '../../__fixtures__/players.js';

/**
 * In-memory Redis mock — replaces ioredis for unit tests.
 * Supports the subset of commands used by roomService.
 */
const store = new Map<string, string>();
const sets = new Map<string, Set<string>>();

const mockPipeline = () => {
  const ops: (() => void)[] = [];
  return {
    set: (key: string, value: string, ..._args: unknown[]) => {
      ops.push(() => store.set(key, value));
    },
    del: (key: string) => {
      ops.push(() => store.delete(key));
    },
    sadd: (key: string, ...members: string[]) => {
      ops.push(() => {
        if (!sets.has(key)) sets.set(key, new Set());
        members.forEach((m) => sets.get(key)!.add(m));
      });
    },
    srem: (key: string, ...members: string[]) => {
      ops.push(() => {
        const s = sets.get(key);
        if (s) members.forEach((m) => s.delete(m));
      });
    },
    exec: async () => {
      ops.forEach((op) => op());
      return ops.map(() => [null, 'OK']);
    },
  };
};

const redisMock = {
  get: async (key: string) => store.get(key) ?? null,
  set: async (key: string, value: string, ..._args: unknown[]) => {
    store.set(key, value);
    return 'OK';
  },
  del: async (key: string) => {
    store.delete(key);
    return 1;
  },
  sadd: async (key: string, ...members: string[]) => {
    if (!sets.has(key)) sets.set(key, new Set());
    members.forEach((m) => sets.get(key)!.add(m));
    return members.length;
  },
  srem: async (key: string, ...members: string[]) => {
    const s = sets.get(key);
    if (s) members.forEach((m) => s.delete(m));
    return members.length;
  },
  smembers: async (key: string) => [...(sets.get(key) ?? [])],
  mget: async (...keys: string[]) => keys.map((k) => store.get(k) ?? null),
  pipeline: mockPipeline,
  watch: async () => 'OK',
  unwatch: async () => 'OK',
  multi: () => {
    const ops: (() => void)[] = [];
    return {
      set: (key: string, value: string, ..._args: unknown[]) => {
        ops.push(() => store.set(key, value));
      },
      exec: async () => {
        ops.forEach((op) => op());
        return ops.map(() => [null, 'OK']);
      },
    };
  },
};

vi.mock('../../config/redis.js', () => ({
  redis: redisMock,
}));

const {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  addSpectator,
  removeSpectator,
  getUserRoom,
} = await import('../roomService.js');

describe('roomService', () => {
  const host = twoPlayers[0]!;
  const player2 = twoPlayers[1]!;

  beforeEach(() => {
    store.clear();
    sets.clear();
  });

  /* ─── createRoom ─────────────────────────────────────────────── */

  describe('createRoom', () => {
    it('should create a room and return it', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      expect(room.roomCode).toBeTruthy();
      expect(room.gameType).toBe('tictactoe');
      expect(room.hostId).toBe(host.userId);
      expect(room.players).toHaveLength(1);
      expect(room.status).toBe('waiting');
    });

    it('should persist room to store', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
      });

      const fetched = await getRoom(room.roomCode);
      expect(fetched).not.toBeNull();
      expect(fetched!.roomCode).toBe(room.roomCode);
    });

    it('should track user→room mapping', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
      });

      const userRoom = await getUserRoom(host.userId);
      expect(userRoom).toBe(room.roomCode);
    });
  });

  /* ─── addPlayer ──────────────────────────────────────────────── */

  describe('addPlayer', () => {
    it('should add a player to the room', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      const updated = await addPlayer(room.roomCode, player2);
      expect(updated.players).toHaveLength(2);
      expect(updated.players[1]!.userId).toBe(player2.userId);
    });

    it('should reject when room is full', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      await addPlayer(room.roomCode, player2);

      const extraPlayer: RoomPlayer = {
        userId: 'user-extra',
        displayName: 'Extra',
        isGuest: false,
        avatarUrl: null,
        position: 2,
        isConnected: true,
      };

      await expect(addPlayer(room.roomCode, extraPlayer)).rejects.toThrow('ROOM_FULL');
    });

    it('should reject duplicate player', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      await expect(addPlayer(room.roomCode, host)).rejects.toThrow('ALREADY_IN_ROOM');
    });
  });

  /* ─── removePlayer ───────────────────────────────────────────── */

  describe('removePlayer', () => {
    it('should remove a player from the room', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      await addPlayer(room.roomCode, player2);
      const updated = await removePlayer(room.roomCode, player2.userId);

      expect(updated).not.toBeNull();
      expect(updated!.players).toHaveLength(1);
      expect(updated!.players[0]!.userId).toBe(host.userId);
    });

    it('should transfer host when host leaves', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      await addPlayer(room.roomCode, player2);
      const updated = await removePlayer(room.roomCode, host.userId);

      expect(updated).not.toBeNull();
      expect(updated!.hostId).toBe(player2.userId);
    });

    it('should delete room when last player leaves', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 2,
      });

      const result = await removePlayer(room.roomCode, host.userId);
      expect(result).toBeNull();

      const fetched = await getRoom(room.roomCode);
      expect(fetched).toBeNull();
    });

    it('should reindex player positions after removal', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
        maxPlayers: 4,
      });

      await addPlayer(room.roomCode, player2);

      const thirdPlayer: RoomPlayer = {
        userId: 'user-3',
        displayName: 'Charlie',
        isGuest: false,
        avatarUrl: null,
        position: 2,
        isConnected: true,
      };

      await addPlayer(room.roomCode, thirdPlayer);
      const updated = await removePlayer(room.roomCode, player2.userId);

      expect(updated!.players[0]!.position).toBe(0);
      expect(updated!.players[1]!.position).toBe(1);
    });
  });

  /* ─── deleteRoom ─────────────────────────────────────────────── */

  describe('deleteRoom', () => {
    it('should remove room and all related keys', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
      });

      await addPlayer(room.roomCode, player2);
      await deleteRoom(room.roomCode);

      const fetched = await getRoom(room.roomCode);
      expect(fetched).toBeNull();

      const hostRoom = await getUserRoom(host.userId);
      expect(hostRoom).toBeNull();

      const p2Room = await getUserRoom(player2.userId);
      expect(p2Room).toBeNull();
    });

    it('should be a no-op for non-existent room', async () => {
      await expect(deleteRoom('nonexist')).resolves.toBeUndefined();
    });
  });

  /* ─── Spectators ─────────────────────────────────────────────── */

  describe('spectators', () => {
    it('should add a spectator', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
      });

      const spectator: RoomSpectator = { userId: 'spec-1', displayName: 'Spectator' };
      const updated = await addSpectator(room.roomCode, spectator);

      expect(updated.spectators).toHaveLength(1);
      expect(updated.spectators[0]!.userId).toBe('spec-1');
    });

    it('should remove a spectator', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
      });

      const spectator: RoomSpectator = { userId: 'spec-1', displayName: 'Spectator' };
      await addSpectator(room.roomCode, spectator);
      const updated = await removeSpectator(room.roomCode, 'spec-1');

      expect(updated.spectators).toHaveLength(0);
    });

    it('should not duplicate spectator on re-add', async () => {
      const room = await createRoom({
        host,
        gameType: 'tictactoe',
        isPrivate: false,
      });

      const spectator: RoomSpectator = { userId: 'spec-1', displayName: 'Spectator' };
      await addSpectator(room.roomCode, spectator);
      const updated = await addSpectator(room.roomCode, spectator);

      expect(updated.spectators).toHaveLength(1);
    });
  });
});
