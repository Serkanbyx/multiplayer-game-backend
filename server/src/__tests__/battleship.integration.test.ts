import { describe, it, expect } from 'vitest';
import { emitWithCb, waitForEvent, createTestClient } from './helpers/createTestClient.js';

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

      p1.socket.emit('game:action', { type: 'battleship:auto_place' });
      await waitForEvent(p1.socket, 'game:state-updated');

      p1.socket.emit('game:action', { type: 'battleship:ready' });
      await waitForEvent(p1.socket, 'game:state-updated');

      p2.socket.emit('game:action', { type: 'battleship:auto_place' });
      await waitForEvent(p2.socket, 'game:state-updated');

      const battlePromises = [p1, p2].map((p) => waitForEvent(p.socket, 'game:state-updated'));
      p2.socket.emit('game:action', { type: 'battleship:ready' });

      const battleStates = await Promise.all(battlePromises);
      for (const s of battleStates) {
        expect(s.gameState.phase).toBe('battle');
      }
    } finally {
      p1.cleanup();
      p2.cleanup();
    }
  });
});
