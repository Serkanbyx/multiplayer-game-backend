import { describe, it, expect } from 'vitest';
import type { Socket as ClientSocket } from 'socket.io-client';
import { createTestClient, emitWithCb, waitForEvent } from './helpers/createTestClient.js';

describe('CardGame Integration', () => {
  it('4 players connect → game starts → hand counts correct → suit enforcement', async () => {
    const players = await Promise.all(
      Array.from({ length: 4 }, () => createTestClient()),
    );

    try {
      const createRes = await emitWithCb<{ success: boolean; room?: any }>(
        players[0]!.socket,
        'room:create',
        { gameType: 'cardgame', isPrivate: false },
      );
      expect(createRes.success).toBe(true);
      const roomCode = createRes.room.roomCode as string;

      const gameStartedPromises = players.map((p) =>
        waitForEvent<any>(p.socket, 'game:started'),
      );

      for (let i = 1; i < 4; i++) {
        await emitWithCb(players[i]!.socket, 'room:join', { roomCode });
      }

      const gameStates = await Promise.all(gameStartedPromises);

      /* ── Verify hand counts ──────────────────────────────────── */
      for (const gs of gameStates) {
        const state = gs.gameState;
        expect(state.gameType).toBe('cardgame');

        for (const p of state.players) {
          expect(p.handCount).toBe(13);
        }
      }

      /* ── Each player should see their own hand ───────────────── */
      const handsReceived = gameStates.filter((gs) => gs.gameState.myHand);
      expect(handsReceived.length).toBe(4);
      for (const gs of handsReceived) {
        expect(gs.gameState.myHand).toHaveLength(13);
      }

      /* ── Play one valid card from current player ─────────────── */
      const currentTurnUserId = gameStates[0]!.gameState.currentTurnUserId;
      const currentPlayerIdx = players.findIndex((p) => p.userId === currentTurnUserId);
      const currentPlayerState = gameStates[currentPlayerIdx]!.gameState;
      const firstCard = currentPlayerState.myHand[0];

      const statePromises = players.map((p) =>
        waitForEvent<any>(p.socket, 'game:state-updated'),
      );

      players[currentPlayerIdx]!.socket.emit('game:action', {
        type: 'cardgame:play_card',
        card: firstCard,
      });

      const updatedStates = await Promise.all(statePromises);

      for (const s of updatedStates) {
        expect(s.gameState.currentTrick).toHaveLength(1);
        expect(s.gameState.currentTrick[0].card).toEqual(firstCard);
      }

      /* ── Verify suit enforcement ─────────────────────────────── */
      const leadSuit = firstCard.suit;
      const nextTurnUserId = updatedStates[0]!.gameState.currentTurnUserId;
      const nextPlayerIdx = players.findIndex((p) => p.userId === nextTurnUserId);
      const nextHand = updatedStates[nextPlayerIdx]!.gameState.myHand;

      if (nextHand) {
        const hasLeadSuit = nextHand.some((c: any) => c.suit === leadSuit);
        const offSuitCard = nextHand.find((c: any) => c.suit !== leadSuit);

        if (hasLeadSuit && offSuitCard) {
          const errorPromise = waitForEvent<any>(players[nextPlayerIdx]!.socket, 'error');
          players[nextPlayerIdx]!.socket.emit('game:action', {
            type: 'cardgame:play_card',
            card: offSuitCard,
          });
          const err = await errorPromise;
          expect(err.message || err.code).toBeDefined();
        }
      }
    } finally {
      players.forEach((p) => p.cleanup());
    }
  });
});
