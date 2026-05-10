import type { TypedServer, TypedSocket } from './index.js';
import { GameFactory } from '../games/GameFactory.js';
import { BaseGame } from '../games/BaseGame.js';
import { TicTacToe } from '../games/TicTacToe.js';
import { CardGame } from '../games/CardGame.js';
import { redis } from '../config/redis.js';
import * as roomService from '../services/roomService.js';
import * as matchService from '../services/matchService.js';
import type { GameType, GameState } from '../../../shared/types/games.js';
import type { Room } from '../../../shared/types/room.js';
import type { MatchPlayerSnapshot, MatchResult } from '../../../shared/types/match.js';

/* ─── Redis Key Helpers ──────────────────────────────────────── */

const gameInstanceKey = (roomCode: string) => `game:instance:${roomCode}`;
const GAME_TTL_SECONDS = 7200;

/* ─── Game Instance Persistence ──────────────────────────────── */

const persistGame = async (roomCode: string, gameType: GameType, game: BaseGame<GameState>): Promise<void> => {
  const payload = JSON.stringify({ gameType, data: game.serialize() });
  await redis.set(gameInstanceKey(roomCode), payload, 'EX', GAME_TTL_SECONDS);
};

const loadGame = async (roomCode: string): Promise<{ game: BaseGame<GameState>; gameType: GameType } | null> => {
  const raw = await redis.get(gameInstanceKey(roomCode));
  if (!raw) return null;

  const { gameType, data } = JSON.parse(raw) as { gameType: GameType; data: unknown };

  if (gameType === 'tictactoe') return { game: TicTacToe.deserialize(data), gameType };
  if (gameType === 'cardgame') return { game: CardGame.deserialize(data), gameType };

  return null;
};

const removeGame = async (roomCode: string): Promise<void> => {
  await redis.del(gameInstanceKey(roomCode));
};

/* ─── Per-Viewer State Emission Helper ───────────────────────── */

const emitStateToRoom = async (
  io: TypedServer,
  room: Room,
  game: BaseGame<GameState>,
  roomCode: string,
): Promise<void> => {
  for (const p of room.players) {
    io.to(`user:${p.userId}`).emit('game:state-updated', {
      roomCode,
      gameState: game.getStateFor(p.userId),
    });
  }

  for (const s of room.spectators) {
    io.to(`user:${s.userId}`).emit('game:state-updated', {
      roomCode,
      gameState: game.getStateFor(null),
    });
  }
};

/* ─── Start Game ──────────────────────────────────────────────── */

export const startGame = async (io: TypedServer, roomCode: string): Promise<void> => {
  const room = await roomService.getRoom(roomCode);
  if (!room) throw new Error('ROOM_NOT_FOUND');

  const game = GameFactory.create(room.gameType, room.players);

  await persistGame(roomCode, room.gameType, game);

  const updatedRoom = await roomService.updateRoom(roomCode, (current) => ({
    ...current,
    status: 'playing' as const,
    gameState: game.getPublicState(),
    startedAt: Date.now(),
  }));

  for (const p of updatedRoom.players) {
    io.to(`user:${p.userId}`).emit('game:started', {
      roomCode,
      gameState: game.getStateFor(p.userId),
    });
  }

  for (const s of updatedRoom.spectators) {
    io.to(`user:${s.userId}`).emit('game:started', {
      roomCode,
      gameState: game.getStateFor(null),
    });
  }

  io.in(`room:${roomCode}`).emit('game:turn', {
    roomCode,
    currentPlayerId: game.getCurrentPlayerId(),
  });
};

/* ─── End Game ────────────────────────────────────────────────── */

const endGame = async (
  io: TypedServer,
  roomCode: string,
  game: BaseGame<GameState>,
  gameType: GameType,
): Promise<void> => {
  const gameResult = game.getResult();
  const result: MatchResult = gameResult?.result === 'win' && gameResult.winnerId
    ? { outcome: 'win', winnerId: gameResult.winnerId }
    : { outcome: 'draw' };

  const room = await roomService.updateRoom(roomCode, (current) => ({
    ...current,
    status: 'finished' as const,
    endedAt: Date.now(),
    rematchVotes: [],
  }));

  const playerSnapshots: MatchPlayerSnapshot[] = room.players.map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    isGuest: p.isGuest,
    score: 0,
    position: p.position,
  }));

  const duration = room.startedAt ? Date.now() - room.startedAt : 0;

  const matchRow = await matchService.recordMatch({
    gameType,
    roomCode,
    players: playerSnapshots,
    result,
    moves: game.getMoveLog().map((m) => {
      const move = m as Record<string, unknown>;
      return {
        by: (move.userId as string) ?? '',
        type: gameType,
        payload: move,
        at: (move.t as number) ?? Date.now(),
      };
    }),
    duration,
    totalRounds: 1,
    startedAt: new Date(room.startedAt ?? Date.now()),
    endedAt: new Date(),
  });

  await removeGame(roomCode);

  const winnerId = gameResult?.winnerId ?? null;
  const winnerPlayer = winnerId
    ? room.players.find((p) => p.userId === winnerId)
    : null;

  io.in(`room:${roomCode}`).emit('game:ended', {
    roomCode,
    result: gameResult?.result ?? 'draw',
    winnerId,
    winnerDisplayName: winnerPlayer?.displayName ?? null,
    matchId: matchRow.id,
    reason: 'completed',
  });

  io.in(`room:${roomCode}`).emit('room:updated', {
    ...room,
    status: 'finished',
    rematchVotes: [],
  });
};

/* ─── Handle Abort on Leave (Forfeit) ─────────────────────────── */

export const handleAbortOnLeave = async (
  io: TypedServer,
  roomCode: string,
  leavingUserId: string,
): Promise<void> => {
  const room = await roomService.getRoom(roomCode);
  if (!room || room.status !== 'playing') return;

  const loaded = await loadGame(roomCode);
  const gameType = loaded?.gameType ?? room.gameType;

  const duration = room.startedAt ? Date.now() - room.startedAt : 0;
  const playerSnapshots: MatchPlayerSnapshot[] = room.players.map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    isGuest: p.isGuest,
    score: 0,
    position: p.position,
  }));

  if (gameType === 'tictactoe') {
    const remainingPlayer = room.players.find((p) => p.userId !== leavingUserId);
    const winnerId = remainingPlayer?.userId ?? null;

    await roomService.updateRoom(roomCode, (current) => ({
      ...current,
      status: 'finished' as const,
      endedAt: Date.now(),
      rematchVotes: [],
    }));

    if (winnerId) {
      await matchService.recordMatch({
        gameType,
        roomCode,
        players: playerSnapshots,
        result: { outcome: 'win', winnerId },
        duration,
        totalRounds: 1,
        startedAt: new Date(room.startedAt ?? Date.now()),
        endedAt: new Date(),
      });
    }

    await removeGame(roomCode);

    io.in(`room:${roomCode}`).emit('game:ended', {
      roomCode,
      result: 'win',
      winnerId,
      winnerDisplayName: remainingPlayer?.displayName ?? null,
      matchId: null,
      reason: 'forfeit',
    });
  } else {
    await roomService.updateRoom(roomCode, (current) => ({
      ...current,
      status: 'finished' as const,
      endedAt: Date.now(),
      rematchVotes: [],
    }));

    await matchService.abortMatch({
      gameType,
      roomCode,
      players: playerSnapshots,
      forfeitedBy: leavingUserId,
      duration,
      totalRounds: 1,
      startedAt: new Date(room.startedAt ?? Date.now()),
      endedAt: new Date(),
    });

    await removeGame(roomCode);

    io.in(`room:${roomCode}`).emit('game:ended', {
      roomCode,
      result: 'aborted',
      winnerId: null,
      winnerDisplayName: null,
      matchId: null,
      reason: 'player_left',
    });
  }
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

      if (!room.players.some((p) => p.userId === userId)) {
        socket.emit('error', { code: 'NOT_A_PLAYER', message: 'Spectators cannot perform game actions' });
        return;
      }

      const loaded = await loadGame(roomCode);
      if (!loaded) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game instance not found' });
        return;
      }

      const { game, gameType } = loaded;
      const actionType = (action as { type?: string }).type ?? '';
      const actionName = actionType.includes(':') ? actionType.split(':')[1]! : actionType;

      try {
        game.applyAction(userId, actionName, action);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid action';
        socket.emit('error', { code: message, message });
        return;
      }

      await persistGame(roomCode, gameType, game);

      await roomService.updateRoom(roomCode, (current) => ({
        ...current,
        gameState: game.getPublicState(),
      }));

      await emitStateToRoom(io, room, game, roomCode);

      if (game.isGameOver()) {
        await endGame(io, roomCode, game, gameType);
      } else {
        io.in(`room:${roomCode}`).emit('game:turn', {
          roomCode,
          currentPlayerId: game.getCurrentPlayerId(),
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
      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      const room = await roomService.getRoom(roomCode);
      if (!room) return;

      if (room.status !== 'finished') {
        socket.emit('error', { code: 'GAME_NOT_ENDED', message: 'Game has not ended yet' });
        return;
      }

      if (!room.players.some((p) => p.userId === userId)) return;

      const updatedRoom = await roomService.updateRoom(roomCode, (current) => {
        if (current.rematchVotes.includes(userId)) return current;
        return { ...current, rematchVotes: [...current.rematchVotes, userId] };
      });

      io.in(`room:${roomCode}`).emit('game:rematch-requested', { userId, votes: updatedRoom.rematchVotes });
      io.in(`room:${roomCode}`).emit('room:updated', updatedRoom);

      const allVoted = updatedRoom.players.every((p) => updatedRoom.rematchVotes.includes(p.userId));
      if (allVoted) {
        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          status: 'waiting' as const,
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
      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      const room = await roomService.getRoom(roomCode);
      if (!room) return;

      if (room.status !== 'finished') {
        socket.emit('error', { code: 'GAME_NOT_ENDED', message: 'Game has not ended yet' });
        return;
      }

      if (!room.players.some((p) => p.userId === userId)) return;

      const updatedRoom = await roomService.updateRoom(roomCode, (current) => {
        if (current.rematchVotes.includes(userId)) return current;
        return { ...current, rematchVotes: [...current.rematchVotes, userId] };
      });

      io.in(`room:${roomCode}`).emit('game:rematch-accepted', { userId, votes: updatedRoom.rematchVotes });
      io.in(`room:${roomCode}`).emit('room:updated', updatedRoom);

      const allVoted = updatedRoom.players.every((p) => updatedRoom.rematchVotes.includes(p.userId));
      if (allVoted) {
        await roomService.updateRoom(roomCode, (current) => ({
          ...current,
          status: 'waiting' as const,
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
      const roomCode = await roomService.getUserRoom(userId);
      if (!roomCode) return;

      const room = await roomService.getRoom(roomCode);
      if (!room || room.status !== 'finished') return;

      if (!room.players.some((p) => p.userId === userId)) return;

      const updatedRoom = await roomService.updateRoom(roomCode, (current) => ({
        ...current,
        rematchVotes: [],
      }));

      io.in(`room:${roomCode}`).emit('game:rematch-declined', { userId });
      io.in(`room:${roomCode}`).emit('room:updated', updatedRoom);
    } catch {
      socket.emit('error', { code: 'REMATCH_DECLINE_FAILED', message: 'Failed to decline rematch' });
    }
  });
};
