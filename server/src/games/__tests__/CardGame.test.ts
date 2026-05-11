import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardGame } from '../CardGame.js';
import { fourPlayers } from '../../__fixtures__/players.js';
import type { Card, Suit } from '../../../../shared/types/games.js';

/**
 * Deterministic shuffle mock: returns input in original order
 * so test outcomes are fully reproducible.
 */
vi.mock('../../utils/shuffle.js', () => ({
  shuffle: <T>(input: readonly T[]): T[] => [...input],
}));

describe('CardGame', () => {
  let game: CardGame;

  beforeEach(() => {
    game = new CardGame({ players: fourPlayers });
  });

  /* ─── Constructor ───────────────────────────────────────────── */

  describe('constructor', () => {
    it('should throw when player count is not 4', () => {
      expect(() => new CardGame({ players: fourPlayers.slice(0, 2) })).toThrow(
        'CardGame requires exactly 4 players',
      );
    });

    it('should assign 4 players', () => {
      const state = game.getPublicState();
      expect(state.players).toHaveLength(4);
    });
  });

  /* ─── Deal ──────────────────────────────────────────────────── */

  describe('deal', () => {
    it('should give each player exactly 13 cards', () => {
      const state = game.getPublicState();
      for (const player of state.players) {
        expect(player.handCount).toBe(13);
      }
    });

    it('should deal unique cards (no duplicates across all hands)', () => {
      const allCards: Card[] = [];
      for (const player of fourPlayers) {
        const state = game.getStateFor(player.userId);
        if (state.myHand) allCards.push(...state.myHand);
      }

      expect(allCards).toHaveLength(52);

      const cardSet = new Set(allCards.map((c) => `${c.suit}${c.rank}`));
      expect(cardSet.size).toBe(52);
    });
  });

  /* ─── Must Follow Suit ──────────────────────────────────────── */

  describe('must-follow-suit enforcement', () => {
    it('should enforce following lead suit when player has that suit', () => {
      const currentId = game.getCurrentPlayerId();
      const myState = game.getStateFor(currentId);
      const myHand = myState.myHand!;

      const leadCard = myHand[0]!;
      game.applyAction(currentId, 'play_card', { card: leadCard });

      const nextId = game.getCurrentPlayerId();
      const nextState = game.getStateFor(nextId);
      const nextHand = nextState.myHand!;

      const hasLeadSuit = nextHand.some((c) => c.suit === leadCard.suit);
      const offSuitCard = nextHand.find((c) => c.suit !== leadCard.suit);

      if (hasLeadSuit && offSuitCard) {
        expect(() => game.applyAction(nextId, 'play_card', { card: offSuitCard })).toThrow(
          'MUST_FOLLOW_SUIT',
        );
      }
    });

    it('should allow off-suit when player has no cards of lead suit', () => {
      const currentId = game.getCurrentPlayerId();
      const myState = game.getStateFor(currentId);
      const myHand = myState.myHand!;

      const leadCard = myHand[0]!;
      game.applyAction(currentId, 'play_card', { card: leadCard });

      const nextId = game.getCurrentPlayerId();
      const nextState = game.getStateFor(nextId);
      const nextHand = nextState.myHand!;

      const hasLeadSuit = nextHand.some((c) => c.suit === leadCard.suit);

      if (!hasLeadSuit) {
        const offSuitCard = nextHand[0]!;
        expect(() => game.applyAction(nextId, 'play_card', { card: offSuitCard })).not.toThrow();
      }
    });
  });

  /* ─── Trick Resolution ──────────────────────────────────────── */

  describe('trick resolution', () => {
    it('should award trick to highest card of lead suit', () => {
      playFullTrick(game);
      const state = game.getPublicState();
      const totalTricks = state.players.reduce((sum, p) => sum + p.tricksWon, 0);
      expect(totalTricks).toBe(1);
    });
  });

  /* ─── Full Game (13 tricks) ──────────────────────────────────── */

  describe('full game', () => {
    it('should end after 13 tricks and produce a winner or draw', () => {
      playFullGame(game);

      expect(game.isGameOver()).toBe(true);
      const result = game.getResult();
      expect(result).not.toBeNull();
      expect(['win', 'draw']).toContain(result!.result);
    });

    it('should have all players with 0 cards after 13 tricks', () => {
      playFullGame(game);

      const state = game.getPublicState();
      for (const player of state.players) {
        expect(player.handCount).toBe(0);
      }
    });

    it('should have total tricks won equal to 13', () => {
      playFullGame(game);

      const state = game.getPublicState();
      const totalTricks = state.players.reduce((sum, p) => sum + p.tricksWon, 0);
      expect(totalTricks).toBe(13);
    });
  });

  /* ─── getStateFor (hidden info) ──────────────────────────────── */

  describe('getStateFor', () => {
    it('should include myHand only for the requesting player', () => {
      const state1 = game.getStateFor(fourPlayers[0]!.userId);
      const state2 = game.getStateFor(fourPlayers[1]!.userId);

      expect(state1.myHand).toBeDefined();
      expect(state2.myHand).toBeDefined();
      expect(state1.myHand).not.toEqual(state2.myHand);
    });

    it('should not include myHand for spectators (null userId)', () => {
      const state = game.getStateFor(null);
      expect(state.myHand).toBeUndefined();
    });

    it('should expose handCount for all players', () => {
      const state = game.getStateFor(null);
      for (const player of state.players) {
        expect(typeof player.handCount).toBe('number');
        expect(player.handCount).toBe(13);
      }
    });

    it('should return correct gameType', () => {
      const state = game.getStateFor(null);
      expect(state.gameType).toBe('cardgame');
    });
  });

  /* ─── Error Cases ────────────────────────────────────────────── */

  describe('error cases', () => {
    it('should reject unknown action', () => {
      const currentId = game.getCurrentPlayerId();
      expect(() => game.applyAction(currentId, 'unknown', {})).toThrow('UNKNOWN_ACTION');
    });

    it('should reject move from wrong player', () => {
      const currentId = game.getCurrentPlayerId();
      const otherId = fourPlayers.find((p) => p.userId !== currentId)!.userId;
      const otherState = game.getStateFor(otherId);
      const card = otherState.myHand![0]!;

      expect(() => game.applyAction(otherId, 'play_card', { card })).toThrow('NOT_YOUR_TURN');
    });

    it('should reject card not in hand', () => {
      const currentId = game.getCurrentPlayerId();
      const fakeCard: Card = { suit: '♠', rank: 'A' };
      const myState = game.getStateFor(currentId);
      const hasFake = myState.myHand!.some(
        (c) => c.suit === fakeCard.suit && c.rank === fakeCard.rank,
      );

      if (!hasFake) {
        expect(() => game.applyAction(currentId, 'play_card', { card: fakeCard })).toThrow(
          'INVALID_CARD',
        );
      }
    });

    it('should reject invalid payload', () => {
      const currentId = game.getCurrentPlayerId();
      expect(() => game.applyAction(currentId, 'play_card', null)).toThrow('INVALID_PAYLOAD');
      expect(() => game.applyAction(currentId, 'play_card', { card: 'not-a-card' })).toThrow(
        'INVALID_PAYLOAD',
      );
    });
  });

  /* ─── Move Log ───────────────────────────────────────────────── */

  describe('getMoveLog', () => {
    it('should track played cards', () => {
      const currentId = game.getCurrentPlayerId();
      const myState = game.getStateFor(currentId);
      const card = myState.myHand![0]!;

      game.applyAction(currentId, 'play_card', { card });

      const log = game.getMoveLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.userId).toBe(currentId);
      expect(log[0]!.card).toEqual(card);
    });
  });
});

/* ─── Helpers ──────────────────────────────────────────────────── */

function playFullTrick(game: CardGame): void {
  for (let i = 0; i < 4; i++) {
    const currentId = game.getCurrentPlayerId();
    const state = game.getStateFor(currentId);
    const hand = state.myHand!;

    if (i === 0) {
      game.applyAction(currentId, 'play_card', { card: hand[0]! });
    } else {
      const leadSuit = state.leadSuit;
      const suitCard = hand.find((c) => c.suit === leadSuit);
      game.applyAction(currentId, 'play_card', { card: suitCard ?? hand[0]! });
    }
  }
}

function playFullGame(game: CardGame): void {
  for (let trick = 0; trick < 13; trick++) {
    playFullTrick(game);
  }
}
