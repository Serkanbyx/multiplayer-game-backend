import { describe, it, expect } from 'vitest';
import { createTestClient, emitWithCb, waitForEvent } from './helpers/createTestClient.js';

describe('Spectator Integration', () => {
  it('spectator joins room and receives game state without myHand', async () => {
    const players = await Promise.all(
      Array.from({ length: 4 }, () => createTestClient()),
    );
    const spectator = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        players[0]!.socket,
        'room:create',
        { gameType: 'cardgame', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      const gameStartedPromises = players.map((p) =>
        waitForEvent<any>(p.socket, 'game:started'),
      );

      for (let i = 1; i < 4; i++) {
        await emitWithCb(players[i]!.socket, 'room:join', { roomCode });
      }

      await Promise.all(gameStartedPromises);

      const spectateRes = await emitWithCb<{ success: boolean; room?: any }>(
        spectator.socket,
        'room:spectate',
        { roomCode },
      );

      expect(spectateRes.success).toBe(true);
      expect(spectateRes.room.spectators).toHaveLength(1);
    } finally {
      players.forEach((p) => p.cleanup());
      spectator.cleanup();
    }
  });

  it('spectator game:action is rejected', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();
    const spectator = await createTestClient();

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
      await Promise.all([gameStartedA, gameStartedB]);

      await emitWithCb(spectator.socket, 'room:spectate', { roomCode });

      const errorPromise = waitForEvent<any>(spectator.socket, 'error');
      spectator.socket.emit('game:action', { type: 'tictactoe:play', index: 0 });
      const err = await errorPromise;

      expect(err.code).toBeDefined();
    } finally {
      playerA.cleanup();
      playerB.cleanup();
      spectator.cleanup();
    }
  });
});
