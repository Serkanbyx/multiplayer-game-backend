import { describe, it, expect } from 'vitest';
import type { Socket as ClientSocket } from 'socket.io-client';
import { emitWithCb, waitForEvent, createTestClient } from './helpers/createTestClient.js';

type StateUpdatedPayload = { gameState: { phase: string; gameType: string } };

const actionAndWaitBoth = async (
  actingSocket: ClientSocket,
  otherSocket: ClientSocket,
  action: { type: string },
): Promise<[StateUpdatedPayload, StateUpdatedPayload]> => {
  const actingUpdate = waitForEvent<StateUpdatedPayload>(actingSocket, 'game:state-updated');
  const otherUpdate = waitForEvent<StateUpdatedPayload>(otherSocket, 'game:state-updated');
  actingSocket.emit('game:action', action);
  return Promise.all([actingUpdate, otherUpdate]);
};

describe('Battleship Integration', () => {
  it('2 players deploy fleets and enter battle phase', async () => {
    const [p1, p2] = await Promise.all([createTestClient(), createTestClient()]);

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: { roomCode: string } }>(
        p1.socket,
        'room:create',
        { gameType: 'battleship', isPrivate: false },
      );
      expect(createRes.success).toBe(true);
      const roomCode = createRes.room!.roomCode;

      const p1StartedPromise = waitForEvent(p1.socket, 'game:started');
      const p2StartedPromise = waitForEvent(p2.socket, 'game:started');

      await emitWithCb(p2.socket, 'room:join', { roomCode });

      const [p1Started, p2Started] = await Promise.all([p1StartedPromise, p2StartedPromise]);

      expect(p1Started.gameState.gameType).toBe('battleship');
      expect(p2Started.gameState.gameType).toBe('battleship');
      expect(p1Started.gameState.phase).toBe('placement');
      expect(p2Started.gameState.phase).toBe('placement');

      await actionAndWaitBoth(p1.socket, p2.socket, { type: 'battleship:auto_place' });
      await actionAndWaitBoth(p1.socket, p2.socket, { type: 'battleship:ready' });
      await actionAndWaitBoth(p2.socket, p1.socket, { type: 'battleship:auto_place' });

      const [p1Battle, p2Battle] = await actionAndWaitBoth(p2.socket, p1.socket, {
        type: 'battleship:ready',
      });

      expect(p1Battle.gameState.phase).toBe('battle');
      expect(p2Battle.gameState.phase).toBe('battle');
    } finally {
      p1.cleanup();
      p2.cleanup();
    }
  });
});
