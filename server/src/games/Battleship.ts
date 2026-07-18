import { BaseGame, type GameConfig, type ActionResult } from './BaseGame.js';
import type {
  BattleshipState,
  BattleshipCell,
  BattleshipShotCell,
  BattleshipShipType,
  BattleshipOrientation,
  BattleshipShip,
} from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';

const BOARD_SIZE = 10;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

const FLEET: readonly { type: BattleshipShipType; size: number }[] = [
  { type: 'carrier', size: 5 },
  { type: 'battleship', size: 4 },
  { type: 'cruiser', size: 3 },
  { type: 'submarine', size: 3 },
  { type: 'destroyer', size: 2 },
];

type MoveEntry =
  | { action: 'auto_place' | 'clear_ships' | 'ready'; userId: string; t: number }
  | { action: 'place_ship'; userId: string; shipType: BattleshipShipType; row: number; col: number; orientation: BattleshipOrientation; t: number }
  | { action: 'fire'; userId: string; row: number; col: number; hit: boolean; t: number };

type PlayerData = {
  userId: string;
  displayName: string;
  board: BattleshipCell[];
  ships: BattleshipShip[];
  shotsReceived: Set<string>;
  shotsFired: Map<string, BattleshipShotCell>;
  ready: boolean;
};

const cellKey = (row: number, col: number): string => `${row},${col}`;

const indexToRowCol = (index: number): { row: number; col: number } => ({
  row: Math.floor(index / BOARD_SIZE),
  col: index % BOARD_SIZE,
});

const rowColToIndex = (row: number, col: number): number => row * BOARD_SIZE + col;

const emptyBoard = (): BattleshipCell[] => Array(CELL_COUNT).fill('empty') as BattleshipCell[];

const emptyOpponentView = (): BattleshipShotCell[] =>
  Array(CELL_COUNT).fill('unknown') as BattleshipShotCell[];

const shipCells = (
  row: number,
  col: number,
  size: number,
  orientation: BattleshipOrientation,
): { row: number; col: number }[] => {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < size; i++) {
    cells.push(
      orientation === 'horizontal'
        ? { row, col: col + i }
        : { row: row + i, col },
    );
  }
  return cells;
};

const isValidPlacement = (
  board: BattleshipCell[],
  cells: { row: number; col: number }[],
): boolean => {
  for (const { row, col } of cells) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    if (board[rowColToIndex(row, col)] !== 'empty') return false;
  }
  return true;
};

const placeShipOnBoard = (
  board: BattleshipCell[],
  type: BattleshipShipType,
  size: number,
  cells: { row: number; col: number }[],
): BattleshipShip => {
  for (const { row, col } of cells) {
    board[rowColToIndex(row, col)] = 'ship';
  }
  return { type, size, cells, sunk: false };
};

const randomOrientation = (): BattleshipOrientation =>
  Math.random() < 0.5 ? 'horizontal' : 'vertical';

export class Battleship extends BaseGame<BattleshipState> {
  private players: [PlayerData, PlayerData];
  private phase: 'placement' | 'battle' | 'finished' = 'placement';
  private currentTurnIndex: 0 | 1 = 0;
  private winner: string | null = null;
  private result: 'win' | 'draw' | null = null;
  private lastShot: BattleshipState['lastShot'] = null;
  private moves: MoveEntry[] = [];

  constructor({ players }: { players: RoomPlayer[] }) {
    super();

    if (players.length !== 2) {
      throw new Error('Battleship requires exactly 2 players');
    }

    this.players = [
      {
        userId: players[0]!.userId,
        displayName: players[0]!.displayName,
        board: emptyBoard(),
        ships: [],
        shotsReceived: new Set(),
        shotsFired: new Map(),
        ready: false,
      },
      {
        userId: players[1]!.userId,
        displayName: players[1]!.displayName,
        board: emptyBoard(),
        ships: [],
        shotsReceived: new Set(),
        shotsFired: new Map(),
        ready: false,
      },
    ];
  }

  static override getConfig(): GameConfig {
    return { gameType: 'battleship', minPlayers: 2, maxPlayers: 2 };
  }

  private getPlayerIndex(userId: string): 0 | 1 {
    const idx = this.players.findIndex((p) => p.userId === userId);
    if (idx !== 0 && idx !== 1) throw new Error('NOT_A_PLAYER');
    return idx as 0 | 1;
  }

  private opponentIndex(playerIdx: 0 | 1): 0 | 1 {
    return playerIdx === 0 ? 1 : 0;
  }

  private remainingShipTypes(player: PlayerData): BattleshipShipType[] {
    const placed = new Set(player.ships.map((s) => s.type));
    return FLEET.filter((s) => !placed.has(s.type)).map((s) => s.type);
  }

  private clearPlayerFleet(player: PlayerData): void {
    player.board = emptyBoard();
    player.ships = [];
    player.ready = false;
  }

  private autoPlaceFleet(player: PlayerData): void {
    this.clearPlayerFleet(player);

    for (const { type, size } of FLEET) {
      let placed = false;
      for (let attempt = 0; attempt < 500 && !placed; attempt++) {
        const orientation = randomOrientation();
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        const cells = shipCells(row, col, size, orientation);
        if (isValidPlacement(player.board, cells)) {
          player.ships.push(placeShipOnBoard(player.board, type, size, cells));
          placed = true;
        }
      }
      if (!placed) throw new Error('AUTO_PLACE_FAILED');
    }
  }

  private tryStartBattle(): void {
    if (!this.players.every((p) => p.ready)) return;

    this.phase = 'battle';
    this.currentTurnIndex = 0;
  }

  private buildOpponentBoard(forPlayer: PlayerData): BattleshipShotCell[] {
    const view = emptyOpponentView();
    for (const [key, value] of forPlayer.shotsFired) {
      const [rowStr, colStr] = key.split(',');
      const index = rowColToIndex(Number(rowStr), Number(colStr));
      view[index] = value;
    }
    return view;
  }

  getStateFor(userId: string | null): BattleshipState {
    const base = this.buildPublicSlice();

    if (!userId) {
      return {
        ...base,
        ownBoard: emptyBoard(),
        ownShips: [],
        opponentBoard: emptyOpponentView(),
        shipsToPlace: [...FLEET.map((s) => s.type)],
      };
    }

    const playerIdx = this.getPlayerIndex(userId);
    const player = this.players[playerIdx]!;

    let currentTurnUserId = base.currentTurnUserId;
    if (this.phase === 'placement' && !player.ready) {
      currentTurnUserId = userId;
    } else if (this.phase === 'placement' && player.ready) {
      currentTurnUserId = null;
    }

    return {
      ...base,
      currentTurnUserId,
      ownBoard: [...player.board],
      ownShips: player.ships.map((s) => ({ ...s, cells: [...s.cells] })),
      opponentBoard: this.buildOpponentBoard(player),
      shipsToPlace: this.remainingShipTypes(player),
    };
  }

  private buildPublicSlice(): Omit<
    BattleshipState,
    'ownBoard' | 'ownShips' | 'opponentBoard' | 'shipsToPlace'
  > {
    return {
      gameType: 'battleship',
      phase: this.phase,
      boardSize: BOARD_SIZE,
      currentTurnUserId:
        this.phase === 'battle' ? this.players[this.currentTurnIndex]!.userId : null,
      players: this.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        ready: p.ready,
      })),
      lastShot: this.lastShot,
      winner: this.winner,
      result: this.result,
    };
  }

  getPublicState(): BattleshipState {
    return this.getStateFor(null);
  }

  applyAction(userId: string, action: string, payload: unknown): ActionResult {
    if (this.result !== null) throw new Error('GAME_OVER');

    if (this.phase === 'placement') {
      return this.applyPlacementAction(userId, action, payload);
    }

    return this.applyBattleAction(userId, action, payload);
  }

  private applyPlacementAction(userId: string, action: string, payload: unknown): ActionResult {
    const playerIdx = this.getPlayerIndex(userId);
    const player = this.players[playerIdx]!;

    if (player.ready) throw new Error('ALREADY_READY');

    switch (action) {
      case 'auto_place': {
        this.autoPlaceFleet(player);
        this.moves.push({ action: 'auto_place', userId, t: Date.now() });
        return { stateChanged: true, gameOver: false };
      }

      case 'clear_ships': {
        this.clearPlayerFleet(player);
        this.moves.push({ action: 'clear_ships', userId, t: Date.now() });
        return { stateChanged: true, gameOver: false };
      }

      case 'place_ship': {
        if (typeof payload !== 'object' || payload === null) throw new Error('INVALID_PAYLOAD');
        const data = payload as Record<string, unknown>;
        const shipType = data.shipType as BattleshipShipType;
        const row = data.row as number;
        const col = data.col as number;
        const orientation = data.orientation as BattleshipOrientation;

        const spec = FLEET.find((s) => s.type === shipType);
        if (!spec) throw new Error('INVALID_SHIP');

        if (player.ships.some((s) => s.type === shipType)) throw new Error('SHIP_ALREADY_PLACED');

        if (!Number.isInteger(row) || !Number.isInteger(col)) throw new Error('INVALID_COORDS');
        if (orientation !== 'horizontal' && orientation !== 'vertical') {
          throw new Error('INVALID_ORIENTATION');
        }

        const cells = shipCells(row, col, spec.size, orientation);
        if (!isValidPlacement(player.board, cells)) throw new Error('INVALID_PLACEMENT');

        player.ships.push(placeShipOnBoard(player.board, shipType, spec.size, cells));
        this.moves.push({
          action: 'place_ship',
          userId,
          shipType,
          row,
          col,
          orientation,
          t: Date.now(),
        });
        return { stateChanged: true, gameOver: false };
      }

      case 'ready': {
        if (player.ships.length !== FLEET.length) throw new Error('FLEET_INCOMPLETE');
        player.ready = true;
        this.moves.push({ action: 'ready', userId, t: Date.now() });
        this.tryStartBattle();
        return { stateChanged: true, gameOver: false };
      }

      default:
        throw new Error('UNKNOWN_ACTION');
    }
  }

  private applyBattleAction(userId: string, action: string, payload: unknown): ActionResult {
    if (action !== 'fire') throw new Error('UNKNOWN_ACTION');
    if (userId !== this.players[this.currentTurnIndex]!.userId) throw new Error('NOT_YOUR_TURN');

    if (typeof payload !== 'object' || payload === null) throw new Error('INVALID_PAYLOAD');
    const data = payload as Record<string, unknown>;
    const row = data.row as number;
    const col = data.col as number;

    if (!Number.isInteger(row) || !Number.isInteger(col)) throw new Error('INVALID_COORDS');
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      throw new Error('INVALID_COORDS');
    }

    const attackerIdx = this.getPlayerIndex(userId);
    const defenderIdx = this.opponentIndex(attackerIdx);
    const attacker = this.players[attackerIdx]!;
    const defender = this.players[defenderIdx]!;
    const key = cellKey(row, col);

    if (attacker.shotsFired.has(key)) throw new Error('ALREADY_FIRED');

    const index = rowColToIndex(row, col);
    const defenderCell = defender.board[index]!;
    const hit = defenderCell === 'ship' || defenderCell === 'hit';

    if (hit) {
      defender.board[index] = 'hit';
    } else {
      defender.board[index] = 'miss';
    }

    defender.shotsReceived.add(key);
    attacker.shotsFired.set(key, hit ? 'hit' : 'miss');

    let sunkShip: BattleshipShipType | null = null;

    if (hit) {
      for (const ship of defender.ships) {
        const allHit = ship.cells.every(({ row: r, col: c }) => {
          const cell = defender.board[rowColToIndex(r, c)]!;
          return cell === 'hit';
        });
        if (allHit && !ship.sunk) {
          ship.sunk = true;
          sunkShip = ship.type;
          for (const { row: r, col: c } of ship.cells) {
            attacker.shotsFired.set(cellKey(r, c), 'sunk');
          }
        }
      }
    }

    this.lastShot = { row, col, hit, sunkShip, shooterId: userId };
    this.moves.push({ action: 'fire', userId, row, col, hit, t: Date.now() });

    const defenderAllSunk = defender.ships.every((s) => s.sunk);
    if (defenderAllSunk) {
      this.result = 'win';
      this.winner = userId;
      this.phase = 'finished';
      return {
        stateChanged: true,
        gameOver: true,
        result: 'win',
        winnerId: userId,
      };
    }

    this.currentTurnIndex = this.currentTurnIndex === 0 ? 1 : 0;
    return { stateChanged: true, gameOver: false };
  }

  getCurrentPlayerId(): string {
    if (this.phase === 'battle') {
      return this.players[this.currentTurnIndex]!.userId;
    }
    return '';
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

  serialize(): unknown {
    return {
      players: this.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        board: p.board,
        ships: p.ships,
        shotsReceived: [...p.shotsReceived],
        shotsFired: [...p.shotsFired.entries()],
        ready: p.ready,
      })),
      phase: this.phase,
      currentTurnIndex: this.currentTurnIndex,
      winner: this.winner,
      result: this.result,
      lastShot: this.lastShot,
      moves: this.moves,
    };
  }

  static override deserialize(raw: unknown): Battleship {
    const data = raw as {
      players: {
        userId: string;
        displayName: string;
        board: BattleshipCell[];
        ships: BattleshipShip[];
        shotsReceived: string[];
        shotsFired: [string, BattleshipShotCell][];
        ready: boolean;
      }[];
      phase: 'placement' | 'battle' | 'finished';
      currentTurnIndex: 0 | 1;
      winner: string | null;
      result: 'win' | 'draw' | null;
      lastShot: BattleshipState['lastShot'];
      moves: MoveEntry[];
    };

    if (!Array.isArray(data.players) || data.players.length !== 2) {
      throw new Error('INVALID_SERIALIZED_DATA');
    }

    const instance = Object.create(Battleship.prototype) as Battleship;
    instance.players = data.players.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      board: p.board,
      ships: p.ships,
      shotsReceived: new Set(p.shotsReceived),
      shotsFired: new Map(p.shotsFired),
      ready: p.ready,
    })) as [PlayerData, PlayerData];
    instance.phase = data.phase;
    instance.currentTurnIndex = data.currentTurnIndex;
    instance.winner = data.winner;
    instance.result = data.result;
    instance.lastShot = data.lastShot;
    instance.moves = data.moves ?? [];
    return instance;
  }
}

export { BOARD_SIZE as BATTLESHIP_BOARD_SIZE, FLEET as BATTLESHIP_FLEET, rowColToIndex, indexToRowCol };
