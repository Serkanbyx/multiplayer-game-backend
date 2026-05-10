import { BaseGame, type GameConfig, type ActionResult } from './BaseGame.js';
import type { TicTacToeState, TicTacToeBoard, Cell } from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';

type Player = { userId: string; displayName: string; symbol: 'X' | 'O' };
type MoveEntry = { userId: string; index: number; symbol: 'X' | 'O'; t: number };

export class TicTacToe extends BaseGame<TicTacToeState> {
  private board: Cell[];
  private players: [Player, Player];
  private currentTurnIndex: 0 | 1;
  private winner: string | null = null;
  private result: 'win' | 'draw' | null = null;
  private moves: MoveEntry[] = [];

  constructor({ players }: { players: RoomPlayer[] }) {
    super();

    if (players.length !== 2) {
      throw new Error('TicTacToe requires exactly 2 players');
    }

    this.players = [
      { userId: players[0]!.userId, displayName: players[0]!.displayName, symbol: 'X' },
      { userId: players[1]!.userId, displayName: players[1]!.displayName, symbol: 'O' },
    ];
    this.board = Array(9).fill(null) as Cell[];
    this.currentTurnIndex = 0;
  }

  static override getConfig(): GameConfig {
    return { gameType: 'tictactoe', minPlayers: 2, maxPlayers: 2 };
  }

  /* ─── State Accessors ──────────────────────────────────────── */

  getStateFor(_userId: string | null): TicTacToeState {
    return this.getPublicState();
  }

  getPublicState(): TicTacToeState {
    return {
      gameType: 'tictactoe',
      board: this.board as unknown as TicTacToeBoard,
      currentTurnUserId: this.getCurrentPlayerId(),
      players: [...this.players],
      winner: this.winner,
      result: this.result,
    };
  }

  /* ─── Core Action Handler ──────────────────────────────────── */

  applyAction(userId: string, action: string, payload: unknown): ActionResult {
    if (this.result !== null) {
      throw new Error('GAME_OVER');
    }

    if (action !== 'play') {
      throw new Error('UNKNOWN_ACTION');
    }

    if (typeof payload !== 'object' || payload === null || typeof (payload as Record<string, unknown>).index !== 'number') {
      throw new Error('INVALID_PAYLOAD');
    }

    if (userId !== this.players[this.currentTurnIndex].userId) {
      throw new Error('NOT_YOUR_TURN');
    }

    const { index } = payload as { index: number };

    if (!Number.isInteger(index) || index < 0 || index > 8) {
      throw new Error('INVALID_MOVE');
    }

    if (this.board[index] !== null) {
      throw new Error('INVALID_MOVE');
    }

    const currentPlayer = this.players[this.currentTurnIndex];
    this.board[index] = currentPlayer.symbol;
    this.moves.push({ userId, index, symbol: currentPlayer.symbol, t: Date.now() });

    // Win/draw detection is added in Step 19 via #checkOutcome

    if (this.result === null) {
      this.currentTurnIndex = this.currentTurnIndex === 0 ? 1 : 0;
    }

    return {
      stateChanged: true,
      gameOver: this.result !== null,
      result: this.result ?? undefined,
      winnerId: this.winner ?? undefined,
    };
  }

  /* ─── Helpers ──────────────────────────────────────────────── */

  getCurrentPlayerId(): string {
    return this.players[this.currentTurnIndex].userId;
  }

  isGameOver(): boolean {
    return this.result !== null;
  }

  getResult(): { result: 'win' | 'draw'; winnerId?: string } | null {
    if (!this.result) return null;
    return this.result === 'win'
      ? { result: 'win', winnerId: this.winner! }
      : { result: 'draw' };
  }

  getMoveLog(): MoveEntry[] {
    return [...this.moves];
  }

  /* ─── Serialization ────────────────────────────────────────── */

  serialize(): unknown {
    return {
      board: this.board,
      players: this.players,
      currentTurnIndex: this.currentTurnIndex,
      winner: this.winner,
      result: this.result,
      moves: this.moves,
    };
  }

  static override deserialize(raw: unknown): TicTacToe {
    const data = raw as {
      board: Cell[];
      players: [Player, Player];
      currentTurnIndex: 0 | 1;
      winner: string | null;
      result: 'win' | 'draw' | null;
      moves: MoveEntry[];
    };

    const instance = Object.create(TicTacToe.prototype) as TicTacToe;
    instance.board = data.board;
    instance.players = data.players;
    instance.currentTurnIndex = data.currentTurnIndex;
    instance.winner = data.winner;
    instance.result = data.result;
    instance.moves = data.moves;
    return instance;
  }
}
