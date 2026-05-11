import { describe, it, expect, beforeEach } from 'vitest';
import { TicTacToe } from '../TicTacToe.js';
import { twoPlayers } from '../../__fixtures__/players.js';

describe('TicTacToe', () => {
  let game: TicTacToe;
  const [p1, p2] = [twoPlayers[0]!, twoPlayers[1]!];

  beforeEach(() => {
    game = new TicTacToe({ players: twoPlayers });
  });

  /* ─── Constructor ───────────────────────────────────────────── */

  describe('constructor', () => {
    it('should throw when player count is not 2', () => {
      expect(() => new TicTacToe({ players: [twoPlayers[0]!] })).toThrow(
        'TicTacToe requires exactly 2 players',
      );
    });

    it('should assign X to first player and O to second', () => {
      const state = game.getStateFor(null);
      expect(state.players[0]!.symbol).toBe('X');
      expect(state.players[1]!.symbol).toBe('O');
    });

    it('should start with player 1 (X) turn', () => {
      expect(game.getCurrentPlayerId()).toBe(p1.userId);
    });

    it('should initialize an empty board', () => {
      const state = game.getStateFor(null);
      expect(state.board.every((cell) => cell === null)).toBe(true);
    });
  });

  /* ─── Move Validation ───────────────────────────────────────── */

  describe('move validation', () => {
    it('should reject move on occupied cell', () => {
      game.applyAction(p1.userId, 'play', { index: 0 });
      expect(() => game.applyAction(p2.userId, 'play', { index: 0 })).toThrow('INVALID_MOVE');
    });

    it('should reject off-turn move', () => {
      expect(() => game.applyAction(p2.userId, 'play', { index: 0 })).toThrow('NOT_YOUR_TURN');
    });

    it('should reject out-of-range index (negative)', () => {
      expect(() => game.applyAction(p1.userId, 'play', { index: -1 })).toThrow('INVALID_MOVE');
    });

    it('should reject out-of-range index (above 8)', () => {
      expect(() => game.applyAction(p1.userId, 'play', { index: 9 })).toThrow('INVALID_MOVE');
    });

    it('should reject non-integer index', () => {
      expect(() => game.applyAction(p1.userId, 'play', { index: 1.5 })).toThrow('INVALID_MOVE');
    });

    it('should reject unknown action', () => {
      expect(() => game.applyAction(p1.userId, 'unknown', { index: 0 })).toThrow('UNKNOWN_ACTION');
    });

    it('should reject invalid payload shape', () => {
      expect(() => game.applyAction(p1.userId, 'play', null)).toThrow('INVALID_PAYLOAD');
      expect(() => game.applyAction(p1.userId, 'play', { foo: 'bar' })).toThrow('INVALID_PAYLOAD');
    });

    it('should reject moves after game is over', () => {
      // X wins: top row (0, 1, 2)
      game.applyAction(p1.userId, 'play', { index: 0 });
      game.applyAction(p2.userId, 'play', { index: 3 });
      game.applyAction(p1.userId, 'play', { index: 1 });
      game.applyAction(p2.userId, 'play', { index: 4 });
      game.applyAction(p1.userId, 'play', { index: 2 }); // X wins

      expect(() => game.applyAction(p2.userId, 'play', { index: 5 })).toThrow('GAME_OVER');
    });
  });

  /* ─── Winning Lines (all 8) ──────────────────────────────────── */

  describe('winning lines', () => {
    const winScenarios: { name: string; xMoves: number[]; oMoves: number[] }[] = [
      { name: 'top row [0,1,2]', xMoves: [0, 1, 2], oMoves: [3, 4] },
      { name: 'middle row [3,4,5]', xMoves: [3, 4, 5], oMoves: [0, 1] },
      { name: 'bottom row [6,7,8]', xMoves: [6, 7, 8], oMoves: [0, 1] },
      { name: 'left col [0,3,6]', xMoves: [0, 3, 6], oMoves: [1, 2] },
      { name: 'middle col [1,4,7]', xMoves: [1, 4, 7], oMoves: [0, 2] },
      { name: 'right col [2,5,8]', xMoves: [2, 5, 8], oMoves: [0, 1] },
      { name: 'diagonal [0,4,8]', xMoves: [0, 4, 8], oMoves: [1, 2] },
      { name: 'anti-diagonal [2,4,6]', xMoves: [2, 4, 6], oMoves: [0, 1] },
    ];

    winScenarios.forEach(({ name, xMoves, oMoves }) => {
      it(`should detect win on ${name}`, () => {
        for (let i = 0; i < xMoves.length; i++) {
          game.applyAction(p1.userId, 'play', { index: xMoves[i] });
          if (i < oMoves.length) {
            game.applyAction(p2.userId, 'play', { index: oMoves[i] });
          }
        }

        expect(game.isGameOver()).toBe(true);
        const result = game.getResult();
        expect(result).toEqual({ result: 'win', winnerId: p1.userId });
      });
    });
  });

  /* ─── Draw Detection ─────────────────────────────────────────── */

  describe('draw detection', () => {
    it('should detect a draw when board is full with no winner', () => {
      // X O X
      // X X O
      // O X O
      const moves = [
        { userId: p1.userId, index: 0 }, // X
        { userId: p2.userId, index: 1 }, // O
        { userId: p1.userId, index: 2 }, // X
        { userId: p2.userId, index: 5 }, // O
        { userId: p1.userId, index: 3 }, // X
        { userId: p2.userId, index: 6 }, // O
        { userId: p1.userId, index: 4 }, // X
        { userId: p2.userId, index: 8 }, // O
        { userId: p1.userId, index: 7 }, // X — board full, no line
      ];

      for (const move of moves) {
        game.applyAction(move.userId, 'play', { index: move.index });
      }

      expect(game.isGameOver()).toBe(true);
      expect(game.getResult()).toEqual({ result: 'draw' });
    });
  });

  /* ─── getStateFor ────────────────────────────────────────────── */

  describe('getStateFor', () => {
    it('should return identical shape for both players and spectators (no hidden info)', () => {
      game.applyAction(p1.userId, 'play', { index: 4 });

      const stateP1 = game.getStateFor(p1.userId);
      const stateP2 = game.getStateFor(p2.userId);
      const stateSpectator = game.getStateFor(null);

      expect(stateP1).toEqual(stateP2);
      expect(stateP1).toEqual(stateSpectator);
    });

    it('should include correct gameType', () => {
      const state = game.getStateFor(null);
      expect(state.gameType).toBe('tictactoe');
    });

    it('should reflect board state after moves', () => {
      game.applyAction(p1.userId, 'play', { index: 0 });
      const state = game.getStateFor(null);
      expect(state.board[0]).toBe('X');
    });
  });

  /* ─── Turn Alternation ───────────────────────────────────────── */

  describe('turn alternation', () => {
    it('should alternate turns between players', () => {
      expect(game.getCurrentPlayerId()).toBe(p1.userId);
      game.applyAction(p1.userId, 'play', { index: 0 });
      expect(game.getCurrentPlayerId()).toBe(p2.userId);
      game.applyAction(p2.userId, 'play', { index: 1 });
      expect(game.getCurrentPlayerId()).toBe(p1.userId);
    });

    it('should not switch turns after game-ending move', () => {
      game.applyAction(p1.userId, 'play', { index: 0 });
      game.applyAction(p2.userId, 'play', { index: 3 });
      game.applyAction(p1.userId, 'play', { index: 1 });
      game.applyAction(p2.userId, 'play', { index: 4 });
      game.applyAction(p1.userId, 'play', { index: 2 }); // X wins

      expect(game.getCurrentPlayerId()).toBe(p1.userId);
    });
  });

  /* ─── Serialization ──────────────────────────────────────────── */

  describe('serialization', () => {
    it('should serialize and deserialize preserving game state', () => {
      game.applyAction(p1.userId, 'play', { index: 4 });
      game.applyAction(p2.userId, 'play', { index: 0 });

      const serialized = game.serialize();
      const restored = TicTacToe.deserialize(serialized);

      expect(restored.getStateFor(null)).toEqual(game.getStateFor(null));
      expect(restored.getCurrentPlayerId()).toBe(game.getCurrentPlayerId());
    });

    it('should throw on invalid serialized data', () => {
      expect(() => TicTacToe.deserialize({ board: 'not-an-array' })).toThrow(
        'INVALID_SERIALIZED_DATA',
      );
    });
  });

  /* ─── Move Log ───────────────────────────────────────────────── */

  describe('getMoveLog', () => {
    it('should track all moves', () => {
      game.applyAction(p1.userId, 'play', { index: 0 });
      game.applyAction(p2.userId, 'play', { index: 4 });

      const log = game.getMoveLog();
      expect(log).toHaveLength(2);
      expect(log[0]!.userId).toBe(p1.userId);
      expect(log[0]!.index).toBe(0);
      expect(log[0]!.symbol).toBe('X');
      expect(log[1]!.userId).toBe(p2.userId);
      expect(log[1]!.index).toBe(4);
      expect(log[1]!.symbol).toBe('O');
    });

    it('should return a copy (not a reference)', () => {
      game.applyAction(p1.userId, 'play', { index: 0 });
      const log1 = game.getMoveLog();
      const log2 = game.getMoveLog();
      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });
  });
});
