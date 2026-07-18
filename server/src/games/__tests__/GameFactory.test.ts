import { describe, it, expect } from 'vitest';
import { GameFactory } from '../GameFactory.js';
import { TicTacToe } from '../TicTacToe.js';
import { Battleship } from '../Battleship.js';
import { twoPlayers } from '../../__fixtures__/players.js';

describe('GameFactory', () => {
  describe('create', () => {
    it('should return TicTacToe instance for "tictactoe"', () => {
      const game = GameFactory.create('tictactoe', twoPlayers);
      expect(game).toBeInstanceOf(TicTacToe);
    });

    it('should return Battleship instance for "battleship"', () => {
      const game = GameFactory.create('battleship', twoPlayers);
      expect(game).toBeInstanceOf(Battleship);
    });

    it('should throw for unknown game type', () => {
      expect(() => GameFactory.create('unknown' as never, twoPlayers)).toThrow('UNKNOWN_GAME_TYPE');
    });
  });

  describe('getConfig', () => {
    it('should return correct config for tictactoe', () => {
      const config = GameFactory.getConfig('tictactoe');
      expect(config).toEqual({
        gameType: 'tictactoe',
        minPlayers: 2,
        maxPlayers: 2,
      });
    });

    it('should return correct config for battleship', () => {
      const config = GameFactory.getConfig('battleship');
      expect(config).toEqual({
        gameType: 'battleship',
        minPlayers: 2,
        maxPlayers: 2,
      });
    });

    it('should throw for unknown game type', () => {
      expect(() => GameFactory.getConfig('unknown' as never)).toThrow('UNKNOWN_GAME_TYPE');
    });
  });

  describe('isValidGameType', () => {
    it('should return true for valid types', () => {
      expect(GameFactory.isValidGameType('tictactoe')).toBe(true);
      expect(GameFactory.isValidGameType('battleship')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(GameFactory.isValidGameType('chess')).toBe(false);
      expect(GameFactory.isValidGameType(42)).toBe(false);
      expect(GameFactory.isValidGameType(null)).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all registered game types', () => {
      const types = GameFactory.list();
      expect(types).toContain('tictactoe');
      expect(types).toContain('battleship');
      expect(types).toHaveLength(2);
    });
  });
});
