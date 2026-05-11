import { describe, it, expect, vi } from 'vitest';
import { GameFactory } from '../GameFactory.js';
import { TicTacToe } from '../TicTacToe.js';
import { CardGame } from '../CardGame.js';
import { twoPlayers, fourPlayers } from '../../__fixtures__/players.js';

vi.mock('../../utils/shuffle.js', () => ({
  shuffle: <T>(input: readonly T[]): T[] => [...input],
}));

describe('GameFactory', () => {
  /* ─── create ─────────────────────────────────────────────────── */

  describe('create', () => {
    it('should return TicTacToe instance for "tictactoe"', () => {
      const game = GameFactory.create('tictactoe', twoPlayers);
      expect(game).toBeInstanceOf(TicTacToe);
    });

    it('should return CardGame instance for "cardgame"', () => {
      const game = GameFactory.create('cardgame', fourPlayers);
      expect(game).toBeInstanceOf(CardGame);
    });

    it('should throw for unknown game type', () => {
      expect(() => GameFactory.create('unknown' as never, twoPlayers)).toThrow('UNKNOWN_GAME_TYPE');
    });
  });

  /* ─── getConfig ──────────────────────────────────────────────── */

  describe('getConfig', () => {
    it('should return correct config for tictactoe', () => {
      const config = GameFactory.getConfig('tictactoe');
      expect(config).toEqual({
        gameType: 'tictactoe',
        minPlayers: 2,
        maxPlayers: 2,
      });
    });

    it('should return correct config for cardgame', () => {
      const config = GameFactory.getConfig('cardgame');
      expect(config).toEqual({
        gameType: 'cardgame',
        minPlayers: 4,
        maxPlayers: 4,
      });
    });

    it('should throw for unknown game type', () => {
      expect(() => GameFactory.getConfig('unknown' as never)).toThrow('UNKNOWN_GAME_TYPE');
    });
  });

  /* ─── isValidGameType ────────────────────────────────────────── */

  describe('isValidGameType', () => {
    it('should return true for valid types', () => {
      expect(GameFactory.isValidGameType('tictactoe')).toBe(true);
      expect(GameFactory.isValidGameType('cardgame')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(GameFactory.isValidGameType('chess')).toBe(false);
      expect(GameFactory.isValidGameType(42)).toBe(false);
      expect(GameFactory.isValidGameType(null)).toBe(false);
    });
  });

  /* ─── list ───────────────────────────────────────────────────── */

  describe('list', () => {
    it('should return all registered game types', () => {
      const types = GameFactory.list();
      expect(types).toContain('tictactoe');
      expect(types).toContain('cardgame');
      expect(types).toHaveLength(2);
    });
  });
});
