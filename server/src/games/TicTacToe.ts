import { BaseGame, type GameConfig, type ActionResult } from './BaseGame.js';
import type { TicTacToeState, TicTacToeBoard, Cell } from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';

type MoveEntry = { userId: string; position: number; symbol: 'X' | 'O'; timestamp: number };

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

const EMPTY_BOARD: TicTacToeBoard = [null, null, null, null, null, null, null, null, null];

export class TicTacToe extends BaseGame<TicTacToeState> {
  private board: Cell[];
  private players: { userId: string; displayName: string; symbol: 'X' | 'O' }[];
  private currentTurnIndex: number;
  private winner: string | null = null;
  private result: 'win' | 'draw' | null = null;
  private moveLog: MoveEntry[] = [];

  constructor({ players }: { players: RoomPlayer[] }) {
    super();

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    this.players = [
      { userId: shuffled[0]!.userId, displayName: shuffled[0]!.displayName, symbol: 'X' },
      { userId: shuffled[1]!.userId, displayName: shuffled[1]!.displayName, symbol: 'O' },
    ];
    this.board = [...EMPTY_BOARD];
    this.currentTurnIndex = 0;
  }

  static override getConfig(): GameConfig {
    return { gameType: 'tictactoe', minPlayers: 2, maxPlayers: 2 };
  }

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

  applyAction(userId: string, action: string, payload: unknown): ActionResult {
    if (this.isGameOver()) {
      throw new Error('GAME_ALREADY_OVER');
    }

    if (action !== 'place') {
      throw new Error('INVALID_ACTION');
    }

    if (userId !== this.getCurrentPlayerId()) {
      throw new Error('NOT_YOUR_TURN');
    }

    if (!this.isValidPlacePayload(payload)) {
      throw new Error('INVALID_PAYLOAD');
    }

    const { position } = payload;

    if (this.board[position] !== null) {
      throw new Error('CELL_OCCUPIED');
    }

    const currentPlayer = this.players[this.currentTurnIndex]!;
    this.board[position] = currentPlayer.symbol;
    this.moveLog.push({ userId, position, symbol: currentPlayer.symbol, timestamp: Date.now() });

    const won = this.checkWin(currentPlayer.symbol);
    if (won) {
      this.winner = userId;
      this.result = 'win';
      return { stateChanged: true, gameOver: true, result: 'win', winnerId: userId };
    }

    const draw = this.board.every((cell) => cell !== null);
    if (draw) {
      this.result = 'draw';
      return { stateChanged: true, gameOver: true, result: 'draw' };
    }

    this.currentTurnIndex = this.currentTurnIndex === 0 ? 1 : 0;
    return { stateChanged: true, gameOver: false };
  }

  getCurrentPlayerId(): string {
    return this.players[this.currentTurnIndex]!.userId;
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
    return [...this.moveLog];
  }

  serialize(): unknown {
    return {
      board: this.board,
      players: this.players,
      currentTurnIndex: this.currentTurnIndex,
      winner: this.winner,
      result: this.result,
      moveLog: this.moveLog,
    };
  }

  static override deserialize(raw: unknown): TicTacToe {
    const data = raw as {
      board: Cell[];
      players: { userId: string; displayName: string; symbol: 'X' | 'O' }[];
      currentTurnIndex: number;
      winner: string | null;
      result: 'win' | 'draw' | null;
      moveLog: MoveEntry[];
    };

    const instance = Object.create(TicTacToe.prototype) as TicTacToe;
    instance.board = data.board;
    instance.players = data.players;
    instance.currentTurnIndex = data.currentTurnIndex;
    instance.winner = data.winner;
    instance.result = data.result;
    instance.moveLog = data.moveLog;
    return instance;
  }

  private checkWin(symbol: 'X' | 'O'): boolean {
    return WINNING_LINES.some(([a, b, c]) =>
      this.board[a] === symbol && this.board[b] === symbol && this.board[c] === symbol
    );
  }

  private isValidPlacePayload(payload: unknown): payload is { position: number } {
    if (typeof payload !== 'object' || payload === null) return false;
    const p = payload as Record<string, unknown>;
    return typeof p.position === 'number' && Number.isInteger(p.position) && p.position >= 0 && p.position <= 8;
  }
}
