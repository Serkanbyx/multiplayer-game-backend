import type { TypedServer, TypedSocket } from './index.js';
import { GameFactory } from '../games/GameFactory.js';
import { BaseGame } from '../games/BaseGame.js';
import { TicTacToe } from '../games/TicTacToe.js';
import { CardGame } from '../games/CardGame.js';
import { redis } from '../config/redis.js';
import * as roomService from '../services/roomService.js';
import type { GameType, GameState } from '../../../shared/types/games.js';

/* ─── Redis Key Helpers ──────────────────────────────────────── */

const gameInstanceKey = (roomCode: string) => `game:instance:${roomCode}`;
const GAME_TTL_SECONDS = 7200;

/* ─── Game Instance Persistence ──────────────────────────────── */

const persistGame = async (roomCode: string, gameType: GameType, game: BaseGame<GameState>): Promise<void> => {
  const payload = JSON.stringify({ gameType, data: game.serialize() });
  await redis.set(gameInstanceKey(roomCode), payload, 'EX', GAME_TTL_SECONDS);
};

const loadGame = async (roomCode: string): Promise<BaseGame<GameState> | null> => {
  const raw = await redis.get(gameInstanceKey(roomCode));
  if (!raw) return null;

  const { gameType, data } = JSON.parse(raw) as { gameType: GameType; data: unknown };

  if (gameType === 'tictactoe') return TicTacToe.deserialize(data);
  if (gameType === 'cardgame') return CardGame.deserialize(data);

  return null;
};

const removeGame = async (roomCode: string): Promise<void> => {
  await redis.del(gameInstanceKey(roomCode));
};

/* ─── Start Game ──────────────────────────────────────────────── */

export const startGame = async (io: TypedServer, roomCode: string): Promise<void> => {
  const room = await roomService.getRoom(roomCode);
  if (!room) throw new Error('ROOM_NOT_FOUND');

  const game = GameFactory.create(room.gameType, room.players);

  await persistGame(roomCode, room.gameType, game);

  await roomService.updateRoom(roomCode, (current) => ({
    ...current,
    status: 'playing',
    gameState: game.getPublicState(),
    startedAt: Date.now(),
  }));

  for (const player of room.players) {
    const sockets = await io.in(`user:${player.userId}`).fetchSockets();
    const state = game.getStateFor(player.userId);
    for (const s of sockets) {
      s.emit('game:started', { roomCode, gameState: state });
    }
  }

  for (const spectator of room.spectators) {
    const sockets = await io.in(`user:${spectator.userId}`).fetchSockets();
    const state = game.getPublicState();
    for (const s of sockets) {
      s.emit('game:started', { roomCode, gameState: state });
    }
  }
};

/* ─── Handle Abort on Leave (Forfeit) ─────────────────────────── */

export const handleAbortOnLeave = async (
  io: TypedServer,
  roomCode: string,
  leavingUserId: string,
): Promise<void> => {
  const room = await roomService.getRoom(roomCode);
  if (!room || room.status !== 'playing') return;

  const otherPlayer = room.players.find((p) => p.userId !== leavingUserId);
  const winnerId = otherPlayer?.userId ?? null;

  await roomService.updateRoom(roomCode, (current) => ({
    ...current,
    status: 'finished',
    endedAt: Date.now(),
  }));

  await removeGame(roomCode);

  io.in(`room:${roomCode}`).emit('game:ended', {
    roomCode,
    result: 'win',
    winnerId,
    reason: 'forfeit',
  });
};

/* ─── Player Check ────────────────────────────────────────────── */

const isPlayerInRoom = async (userId: string): Promise<boolean> => {
  const roomCode = await roomService.getUserRoom(userId);
  if (!roomCode) return false;

  const room = await roomService.getRoom(roomCode);
  if (!room) return false;

  return room.players.some((p) => p.userId === userId);
};

/* ─── Handler Registration ─────────────────────────────────────── */

export const registerGameHandlers = (io: TypedServer, socket: TypedSocket): void => {
  const userId = socket.data.user._id;

  /* ── game:action ─────────────────────────────────────────────── */

  socket.on('game:action', async (action) => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) {
        socket.emit('error', { code: 'NOT_A_PLAYER', message: 'Spectators cannot perform game actions' });
        return;
      }

      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) {
        socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You are not in a room' });
        return;
      }

      const room = await roomService.getRoom(roomCode);
      if (!room || room.status !== 'playing') {
        socket.emit('error', { code: 'GAME_NOT_ACTIVE', message: 'No active game in this room' });
        return;
      }

      const game = await loadGame(roomCode);
      if (!game) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game instance not found' });
        return;
      }

      const actionType = (action as { type?: string }).type ?? '';
      const actionName = actionType.includes(':') ? actionType.split(':')[1]! : actionType;

      const result = game.applyAction(userId, actionName, action);

      if (result.stateChanged) {
        await persistGame(roomCode, room.gameType, game);

        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          gameState: game.getPublicState(),
        }));

        for (const player of room.players) {
          const sockets = await io.in(`user:${player.userId}`).fetchSockets();
          const state = game.getStateFor(player.userId);
          for (const s of sockets) {
            s.emit('game:state-updated', { roomCode, gameState: state });
          }
        }

        for (const spectator of room.spectators) {
          const sockets = await io.in(`user:${spectator.userId}`).fetchSockets();
          const state = game.getPublicState();
          for (const s of sockets) {
            s.emit('game:state-updated', { roomCode, gameState: state });
          }
        }
      }

      if (result.gameOver) {
        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          status: 'finished',
          endedAt: Date.now(),
        }));

        await removeGame(roomCode);

        io.in(`room:${roomCode}`).emit('game:ended', {
          roomCode,
          result: result.result!,
          winnerId: result.winnerId ?? null,
          reason: 'completed',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process game action';
      socket.emit('error', { code: 'GAME_ACTION_FAILED', message });
    }
  });

  /* ── game:rematch-request ──────────────────────────────────────── */

  socket.on('game:rematch-request', async () => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) return;

      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      const room = await roomService.updateRoom(roomCode, (current) => {
        if (current.rematchVotes.includes(userId)) return current;
        return { ...current, rematchVotes: [...current.rematchVotes, userId] };
      });

      io.in(`room:${roomCode}`).emit('game:rematch-requested', { userId, votes: room.rematchVotes });

      const allVoted = room.players.every((p) => room.rematchVotes.includes(p.userId));
      if (allVoted) {
        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          status: 'waiting',
          gameState: null,
          rematchVotes: [],
          endedAt: null,
          startedAt: null,
        }));

        await startGame(io, roomCode);
      }
    } catch {
      socket.emit('error', { code: 'REMATCH_REQUEST_FAILED', message: 'Failed to request rematch' });
    }
  });

  /* ── game:rematch-accept ───────────────────────────────────────── */

  socket.on('game:rematch-accept', async () => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) return;

      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      const room = await roomService.updateRoom(roomCode, (current) => {
        if (current.rematchVotes.includes(userId)) return current;
        return { ...current, rematchVotes: [...current.rematchVotes, userId] };
      });

      io.in(`room:${roomCode}`).emit('game:rematch-accepted', { userId, votes: room.rematchVotes });

      const allVoted = room.players.every((p) => room.rematchVotes.includes(p.userId));
      if (allVoted) {
        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          status: 'waiting',
          gameState: null,
          rematchVotes: [],
          endedAt: null,
          startedAt: null,
        }));

        await startGame(io, roomCode);
      }
    } catch {
      socket.emit('error', { code: 'REMATCH_ACCEPT_FAILED', message: 'Failed to accept rematch' });
    }
  });

  /* ── game:rematch-decline ──────────────────────────────────────── */

  socket.on('game:rematch-decline', async () => {
    try {
      const isPlayer = await isPlayerInRoom(userId);
      if (!isPlayer) return;

      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      await roomService.updateRoom(roomCode, (current) => ({
        ...current,
        rematchVotes: [],
      }));

      io.in(`room:${roomCode}`).emit('game:rematch-declined', { userId });
    } catch {
      socket.emit('error', { code: 'REMATCH_DECLINE_FAILED', message: 'Failed to decline rematch' });
    }
  });
};
