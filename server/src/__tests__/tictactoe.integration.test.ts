import { describe, it, expect } from 'vitest';
import { createTestClient, emitWithCb, waitForEvent } from './helpers/createTestClient.js';
import { getTestContext } from './helpers/testContext.js';

describe('TicTacToe Integration — full game', () => {
  it('two players play a full game → win detected → match recorded → stats updated', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        playerA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      expect(createRes.success).toBe(true);
      const roomCode = createRes.room.roomCode as string;

      const gameStartedA = waitForEvent<any>(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent<any>(playerB.socket, 'game:started');

      await emitWithCb(playerB.socket, 'room:join', { roomCode });

      const [stateA, stateB] = await Promise.all([gameStartedA, gameStartedB]);

      expect(stateA.roomCode).toBe(roomCode);
      expect(stateB.roomCode).toBe(roomCode);

      const gsA = stateA.gameState;
      const xPlayer = gsA.players.find((p: any) => p.symbol === 'X');
      const oPlayer = gsA.players.find((p: any) => p.symbol === 'O');

      const xSocket = xPlayer.userId === playerA.userId ? playerA.socket : playerB.socket;
      const oSocket = xPlayer.userId === playerA.userId ? playerB.socket : playerA.socket;
      const xUserId = xPlayer.userId;
      const oUserId = oPlayer.userId;

      const playAndWait = async (actingSocket: any, otherSocket: any, index: number) => {
        const p1 = waitForEvent<any>(actingSocket, 'game:state-updated');
        const p2 = waitForEvent<any>(otherSocket, 'game:state-updated');
        actingSocket.emit('game:action', { type: 'tictactoe:play', index });
        await Promise.all([p1, p2]);
      };

      // X plays 0
      await playAndWait(xSocket, oSocket, 0);
      // O plays 3
      await playAndWait(oSocket, xSocket, 3);
      // X plays 1
      await playAndWait(xSocket, oSocket, 1);
      // O plays 4
      await playAndWait(oSocket, xSocket, 4);

      // X plays 2 — should win
      const gameEndedX = waitForEvent<any>(xSocket, 'game:ended');
      const gameEndedO = waitForEvent<any>(oSocket, 'game:ended');

      xSocket.emit('game:action', { type: 'tictactoe:play', index: 2 });

      const [endResultX, endResultO] = await Promise.all([gameEndedX, gameEndedO]);

      expect(endResultX.result).toBe('win');
      expect(endResultX.winnerId).toBe(xUserId);
      expect(endResultX.reason).toBe('completed');
      expect(endResultO.winnerId).toBe(xUserId);

      /* ── Verify match in Postgres ────────────────────────────── */
      const { db } = getTestContext();
      const { matches, users } = await import('../db/schema/index.js');
      const { eq } = await import('drizzle-orm');

      const [match] = await db
        .select()
        .from(matches)
        .where(eq(matches.roomCode, roomCode))
        .limit(1);

      expect(match).toBeDefined();
      expect(match.gameType).toBe('tictactoe');
      expect(match.result).toEqual({ outcome: 'win', winnerId: xUserId });

      /* ── Verify stats updated ────────────────────────────────── */
      const [winner] = await db.select().from(users).where(eq(users.id, xUserId)).limit(1);
      const [loser] = await db.select().from(users).where(eq(users.id, oUserId)).limit(1);

      expect((winner.stats as any).wins).toBe(1);
      expect((winner.stats as any).gamesPlayed).toBe(1);
      expect((loser.stats as any).losses).toBe(1);
      expect((loser.stats as any).gamesPlayed).toBe(1);
    } finally {
      playerA.cleanup();
      playerB.cleanup();
    }
  });

  it('rejects a move on an occupied cell', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        playerA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      const gameStartedA = waitForEvent<any>(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent<any>(playerB.socket, 'game:started');
      await emitWithCb(playerB.socket, 'room:join', { roomCode });
      const [stateA] = await Promise.all([gameStartedA, gameStartedB]);

      const currentPlayerId = stateA.gameState.currentTurnUserId;
      const currentSocket = currentPlayerId === playerA.userId ? playerA.socket : playerB.socket;
      const otherSocket = currentPlayerId === playerA.userId ? playerB.socket : playerA.socket;

      // Current player makes a valid move at index 0
      const p1 = waitForEvent<any>(currentSocket, 'game:state-updated');
      const p2 = waitForEvent<any>(otherSocket, 'game:state-updated');
      currentSocket.emit('game:action', { type: 'tictactoe:play', index: 0 });
      await Promise.all([p1, p2]);

      // Other player (now current) tries to play on the same occupied cell
      const errorPromise = waitForEvent<any>(otherSocket, 'error');
      otherSocket.emit('game:action', { type: 'tictactoe:play', index: 0 });
      const err = await errorPromise;
      expect(err.code || err.message).toBeDefined();
    } finally {
      playerA.cleanup();
      playerB.cleanup();
    }
  });

  it('rejects a move from a player when it is not their turn', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        playerA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      const gameStartedA = waitForEvent<any>(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent<any>(playerB.socket, 'game:started');
      await emitWithCb(playerB.socket, 'room:join', { roomCode });
      const [stateA] = await Promise.all([gameStartedA, gameStartedB]);

      const notCurrentId = stateA.gameState.currentTurnUserId === playerA.userId
        ? playerB.userId
        : playerA.userId;
      const wrongSocket = notCurrentId === playerA.userId ? playerA.socket : playerB.socket;

      const errorPromise = waitForEvent<any>(wrongSocket, 'error');
      wrongSocket.emit('game:action', { type: 'tictactoe:play', index: 4 });
      const err = await errorPromise;
      expect(err.code || err.message).toBeDefined();
    } finally {
      playerA.cleanup();
      playerB.cleanup();
    }
  });
});
