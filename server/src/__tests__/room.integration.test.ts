import { describe, it, expect } from 'vitest';
import { createTestClient, emitWithCb, waitForEvent } from './helpers/createTestClient.js';

describe('Room Integration', () => {
  it('two clients connect → A creates room → B joins → both receive room:updated', async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        clientA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );

      expect(createRes.success).toBe(true);
      const roomCode = createRes.room.roomCode as string;

      const roomUpdatePromise = waitForEvent<any>(clientA.socket, 'room:updated');

      const joinRes = await emitWithCb<{ success: boolean; room?: any }>(
        clientB.socket,
        'room:join',
        { roomCode },
      );

      expect(joinRes.success).toBe(true);
      expect(joinRes.room.players).toHaveLength(2);

      const updatedRoom = await roomUpdatePromise;
      expect(updatedRoom.players).toHaveLength(2);
    } finally {
      clientA.cleanup();
      clientB.cleanup();
    }
  });

  it('rejects join into a full tictactoe room (max 2 players)', async () => {
    const clientA = await createTestClient();
    const clientB = await createTestClient();
    const clientC = await createTestClient();

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        clientA.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );
      const roomCode = createRes.room.roomCode as string;

      await emitWithCb(clientB.socket, 'room:join', { roomCode });

      const thirdJoinRes = await emitWithCb<{ success: boolean; error?: string }>(
        clientC.socket,
        'room:join',
        { roomCode },
      );

      expect(thirdJoinRes.success).toBe(false);
      expect(thirdJoinRes.error).toBeDefined();
    } finally {
      clientA.cleanup();
      clientB.cleanup();
      clientC.cleanup();
    }
  });

  it('rejects joining a non-existent room', async () => {
    const client = await createTestClient();

    try {
      const res = await emitWithCb<{ success: boolean; error?: string }>(
        client.socket,
        'room:join',
        { roomCode: 'INVALID_CODE' },
      );

      expect(res.success).toBe(false);
    } finally {
      client.cleanup();
    }
  });

  it('player can leave a room', async () => {
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

      const leftPromise = waitForEvent<any>(clientA.socket, 'room:player-left');

      clientB.socket.emit('room:leave');

      const leftData = await leftPromise;
      expect(leftData.playerId).toBe(clientB.userId);
    } finally {
      clientA.cleanup();
      clientB.cleanup();
    }
  });
});
