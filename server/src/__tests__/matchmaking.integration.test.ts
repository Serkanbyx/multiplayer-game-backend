import { describe, it, expect } from 'vitest';
import { createTestClient, emitWithCb, waitForEvent, sleep } from './helpers/createTestClient.js';

describe('Matchmaking Integration', () => {
  it('two clients queue for tictactoe → both receive matchmaking:found with same roomCode', async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();

    try {
      const foundA = waitForEvent<{ roomCode: string }>(clientA.socket, 'matchmaking:found');
      const foundB = waitForEvent<{ roomCode: string }>(clientB.socket, 'matchmaking:found');

      clientA.socket.emit('matchmaking:join', { gameType: 'tictactoe' });

      await sleep(100);

      clientB.socket.emit('matchmaking:join', { gameType: 'tictactoe' });

      const resultA = await foundA;
      const resultB = await foundB;

      expect(resultA.roomCode).toBeDefined();
      expect(resultA.roomCode).toBe(resultB.roomCode);
    } finally {
      clientA.cleanup();
      clientB.cleanup();
    }
  });

  it('matchmaking pairs two players → game starts automatically', async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();

    try {
      const foundA = waitForEvent<{ roomCode: string }>(clientA.socket, 'matchmaking:found');
      const foundB = waitForEvent<{ roomCode: string }>(clientB.socket, 'matchmaking:found');
      const startedA = waitForEvent<{ roomCode: string; gameState: { gameType: string } }>(
        clientA.socket,
        'game:started',
      );
      const startedB = waitForEvent<{ roomCode: string; gameState: { gameType: string } }>(
        clientB.socket,
        'game:started',
      );

      clientA.socket.emit('matchmaking:join', { gameType: 'tictactoe' });
      await sleep(100);
      clientB.socket.emit('matchmaking:join', { gameType: 'tictactoe' });

      const [resultA, resultB, gameA, gameB] = await Promise.all([
        foundA,
        foundB,
        startedA,
        startedB,
      ]);

      expect(resultA.roomCode).toBe(resultB.roomCode);
      expect(gameA.roomCode).toBe(resultA.roomCode);
      expect(gameB.roomCode).toBe(resultA.roomCode);
      expect(gameA.gameState.gameType).toBe('tictactoe');
      expect(gameB.gameState.gameType).toBe('tictactoe');

      const rejoinRes = await emitWithCb<{ success: boolean; room?: { status: string; gameState?: unknown } }>(
        clientA.socket,
        'room:join',
        { roomCode: resultA.roomCode },
      );

      expect(rejoinRes.success).toBe(true);
      expect(rejoinRes.room?.status).toBe('playing');
      expect(rejoinRes.room?.gameState).toBeDefined();
    } finally {
      clientA.cleanup();
      clientB.cleanup();
    }
  });

  it('client can cancel matchmaking', async () => {
    const client = await createTestClient();

    try {
      const searchingPromise = waitForEvent<any>(client.socket, 'matchmaking:searching');
      client.socket.emit('matchmaking:join', { gameType: 'tictactoe' });
      await searchingPromise;

      const cancelledPromise = waitForEvent(client.socket, 'matchmaking:cancelled');
      client.socket.emit('matchmaking:leave');
      await cancelledPromise;
    } finally {
      client.cleanup();
    }
  });
});
