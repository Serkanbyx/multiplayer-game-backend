import { describe, it, expect } from 'vitest';
import { createTestClient, waitForEvent, sleep } from './helpers/createTestClient.js';

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
