import { describe, it, expect } from 'vitest';
import { createTestClient, emitWithCb, waitForEvent, sleep } from './helpers/createTestClient.js';

describe('Chat Integration', () => {
  it('message is broadcast to all players in the room', async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        clientA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;
      await emitWithCb(clientB.socket, 'room:join', { roomCode });

      const msgPromise = waitForEvent<any>(clientB.socket, 'chat:message');
      clientA.socket.emit('chat:message', { message: 'Hello World!' });
      const msg = await msgPromise;

      expect(msg.senderId).toBe(clientA.userId);
      expect(msg.message).toBe('Hello World!');
      expect(msg.timestamp).toBeDefined();
    } finally {
      clientA.cleanup();
      clientB.cleanup();
    }
  });

  it('rejects messages exceeding 300 characters', async () => {
    const client = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        client.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );

      const longMsg = 'A'.repeat(301);
      const errorPromise = waitForEvent<any>(client.socket, 'error');
      client.socket.emit('chat:message', { message: longMsg });
      const err = await errorPromise;

      expect(err.code || err.message).toBeDefined();
    } finally {
      client.cleanup();
    }
  });

  it('throttles messages sent within 500ms', async () => {
    const client = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        client.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );

      client.socket.emit('chat:message', { message: 'First message' });

      await sleep(50);

      const errorPromise = waitForEvent<any>(client.socket, 'error');
      client.socket.emit('chat:message', { message: 'Second message too fast' });
      const err = await errorPromise;

      expect(err.code).toBe('CHAT_THROTTLED');
    } finally {
      client.cleanup();
    }
  });

  it('enforces 50-message history cap', async () => {
    const client = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        client.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      for (let i = 0; i < 55; i++) {
        client.socket.emit('chat:message', { message: `Msg ${i}` });
        await sleep(550);
      }

      const { redis } = await import('../config/redis.js');
      const roomData = await redis.get(`room:${roomCode}`);
      if (roomData) {
        const room = JSON.parse(roomData);
        expect(room.chat.length).toBeLessThanOrEqual(50);
      }
    } finally {
      client.cleanup();
    }
  }, 35_000);
});
