import { describe, it, expect } from 'vitest';
import { createTestClient, emitWithCb, waitForEvent } from './helpers/createTestClient.js';

describe('Spectator Integration', () => {
  it('spectator joins room and is listed as spectator', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();
    const spectator = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: { roomCode: string } }>(
        playerA.socket,
        'room:create',
        { gameType: 'battleship', isPrivate: false },
      );
      const roomCode = createRes.room!.roomCode;

      const gameStartedA = waitForEvent(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent(playerB.socket, 'game:started');
      await emitWithCb(playerB.socket, 'room:join', { roomCode });
      await Promise.all([gameStartedA, gameStartedB]);

      const spectateRes = await emitWithCb<{ success: boolean; room?: { spectators: unknown[] } }>(
        spectator.socket,
        'room:spectate',
        { roomCode },
      );

      expect(spectateRes.success).toBe(true);
      expect(spectateRes.room!.spectators).toHaveLength(1);
    } finally {
      playerA.cleanup();
      playerB.cleanup();
      spectator.cleanup();
    }
  });

  it('spectator game:action is rejected', async () => {
    const playerA = await createTestClient();
    const playerB = await createTestClient();
    const spectator = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: { roomCode: string } }>(
        playerA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room!.roomCode;

      const gameStartedA = waitForEvent(playerA.socket, 'game:started');
      const gameStartedB = waitForEvent(playerB.socket, 'game:started');
      await emitWithCb(playerB.socket, 'room:join', { roomCode });
      await Promise.all([gameStartedA, gameStartedB]);

      await emitWithCb(spectator.socket, 'room:spectate', { roomCode });

      const errorPromise = waitForEvent(spectator.socket, 'error');
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
