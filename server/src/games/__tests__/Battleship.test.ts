import { describe, it, expect, beforeEach } from 'vitest';
import { Battleship } from '../Battleship.js';
import { twoPlayers } from '../../__fixtures__/players.js';

describe('Battleship', () => {
  let game: Battleship;
  const [p1, p2] = [twoPlayers[0]!, twoPlayers[1]!];

  beforeEach(() => {
    game = new Battleship({ players: twoPlayers });
  });

  describe('constructor', () => {
    it('should throw when player count is not 2', () => {
      expect(() => new Battleship({ players: [twoPlayers[0]!] })).toThrow(
        'Battleship requires exactly 2 players',
      );
    });

    it('should start in placement phase', () => {
      const state = game.getStateFor(p1.userId);
      expect(state.phase).toBe('placement');
      expect(state.shipsToPlace).toHaveLength(5);
    });
  });

  describe('placement', () => {
    it('should auto-place a full fleet', () => {
      game.applyAction(p1.userId, 'auto_place', {});
      const state = game.getStateFor(p1.userId);
      expect(state.ownShips).toHaveLength(5);
      expect(state.shipsToPlace).toHaveLength(0);
    });

    it('should mark player ready and start battle when both ready', () => {
      game.applyAction(p1.userId, 'auto_place', {});
      game.applyAction(p1.userId, 'ready', {});
      game.applyAction(p2.userId, 'auto_place', {});
      game.applyAction(p2.userId, 'ready', {});

      const state = game.getStateFor(p1.userId);
      expect(state.phase).toBe('battle');
      expect(state.currentTurnUserId).toBe(p1.userId);
    });

    it('should reject ready before fleet is complete', () => {
      expect(() => game.applyAction(p1.userId, 'ready', {})).toThrow('FLEET_INCOMPLETE');
    });
  });

  describe('battle', () => {
    beforeEach(() => {
      game.applyAction(p1.userId, 'auto_place', {});
      game.applyAction(p1.userId, 'ready', {});
      game.applyAction(p2.userId, 'auto_place', {});
      game.applyAction(p2.userId, 'ready', {});
    });

    it('should alternate turns on miss', () => {
      game.applyAction(p1.userId, 'fire', { row: 0, col: 0 });
      expect(game.getCurrentPlayerId()).toBe(p2.userId);
    });

    it('should reject firing the same cell twice', () => {
      game.applyAction(p1.userId, 'fire', { row: 0, col: 0 });
      game.applyAction(p2.userId, 'fire', { row: 1, col: 1 });
      expect(() => game.applyAction(p1.userId, 'fire', { row: 0, col: 0 })).toThrow('ALREADY_FIRED');
    });

    it('should hide opponent ships in personalized state', () => {
      const p1State = game.getStateFor(p1.userId);
      const p2State = game.getStateFor(p2.userId);
      expect(p1State.ownBoard.some((c) => c === 'ship')).toBe(true);
      expect(p2State.opponentBoard.every((c) => c === 'unknown')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should round-trip serialized state', () => {
      game.applyAction(p1.userId, 'auto_place', {});
      game.applyAction(p1.userId, 'ready', {});
      game.applyAction(p2.userId, 'auto_place', {});
      game.applyAction(p2.userId, 'ready', {});
      game.applyAction(p1.userId, 'fire', { row: 0, col: 0 });

      const restored = Battleship.deserialize(game.serialize());
      expect(restored.getStateFor(p1.userId)).toEqual(game.getStateFor(p1.userId));
    });
  });
});
