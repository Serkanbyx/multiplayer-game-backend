export type GameType = "tic-tac-toe" | "card-game";

/** Tic-Tac-Toe cell value: null = empty, "X" or "O" */
export type Cell = "X" | "O" | null;

export interface Card {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: string;
  value: number;
}

export interface TicTacToeState {
  board: Cell[];
  currentTurn: "X" | "O";
  playerSymbols: Record<string, "X" | "O">;
  winner: string | null;
  isDraw: boolean;
  moveCount: number;
}

export interface CardGameState {
  hands: Record<string, Card[]>;
  pile: Card[];
  currentTurnPlayerId: string;
  scores: Record<string, number>;
  roundNumber: number;
  maxRounds: number;
  lastPlayedCard: Card | null;
}

export type GameState = TicTacToeState | CardGameState;

export type GameAction =
  | { type: "tic-tac-toe:place"; position: number }
  | { type: "card-game:play"; cardId: string }
  | { type: "card-game:draw" };
