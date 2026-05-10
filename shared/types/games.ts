export type GameType = 'tictactoe' | 'cardgame';

export type Cell = null | 'X' | 'O';
export type TicTacToeBoard = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Card = { suit: Suit; rank: Rank };

export type TicTacToeState = {
  gameType: 'tictactoe';
  board: TicTacToeBoard;
  currentTurnUserId: string;
  players: { userId: string; displayName: string; symbol: 'X' | 'O' }[];
  winner: string | null;
  result: 'win' | 'draw' | null;
};

export type CardGameState = {
  gameType: 'cardgame';
  players: { userId: string; displayName: string; position: 0 | 1 | 2 | 3; handCount: number; tricksWon: number }[];
  myHand?: Card[];
  currentTrick: { userId: string; card: Card }[];
  leadSuit: Suit | null;
  currentTurnUserId: string;
  trickNumber: number;
  result: 'win' | 'draw' | null;
  winner: string | null;
};

export type GameState = TicTacToeState | CardGameState;

export type GameAction =
  | { type: 'tictactoe:play'; index: number }
  | { type: 'cardgame:play'; card: Card }
  | { type: 'cardgame:draw' };
