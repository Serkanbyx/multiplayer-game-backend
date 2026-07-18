export type GameType = 'tictactoe' | 'battleship';

export type Cell = null | 'X' | 'O';
export type TicTacToeBoard = readonly [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

export type TicTacToeState = {
  gameType: 'tictactoe';
  board: TicTacToeBoard;
  currentTurnUserId: string;
  players: { userId: string; displayName: string; symbol: 'X' | 'O' }[];
  winner: string | null;
  result: 'win' | 'draw' | null;
  winningLine: readonly [number, number, number] | null;
};

export type BattleshipCell = 'empty' | 'ship' | 'hit' | 'miss';
export type BattleshipShotCell = 'unknown' | 'hit' | 'miss' | 'sunk';
export type BattleshipShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';
export type BattleshipOrientation = 'horizontal' | 'vertical';

export type BattleshipShip = {
  type: BattleshipShipType;
  size: number;
  cells: readonly { row: number; col: number }[];
  sunk: boolean;
};

export type BattleshipLastShot = {
  row: number;
  col: number;
  hit: boolean;
  sunkShip: BattleshipShipType | null;
  shooterId: string;
};

export type BattleshipState = {
  gameType: 'battleship';
  phase: 'placement' | 'battle' | 'finished';
  boardSize: 10;
  currentTurnUserId: string | null;
  players: { userId: string; displayName: string; ready: boolean }[];
  ownBoard: readonly BattleshipCell[];
  ownShips: readonly BattleshipShip[];
  opponentBoard: readonly BattleshipShotCell[];
  shipsToPlace: readonly BattleshipShipType[];
  lastShot: BattleshipLastShot | null;
  winner: string | null;
  result: 'win' | 'draw' | null;
};

export type GameState = TicTacToeState | BattleshipState;

export type GameAction =
  | { type: 'tictactoe:play'; index: number }
  | { type: 'battleship:auto_place' }
  | { type: 'battleship:clear_ships' }
  | { type: 'battleship:place_ship'; shipType: BattleshipShipType; row: number; col: number; orientation: BattleshipOrientation }
  | { type: 'battleship:ready' }
  | { type: 'battleship:fire'; row: number; col: number };
