import { TicTacToe } from './TicTacToe.js';
import { CardGame } from './CardGame.js';
import type { GameType } from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';
import type { GameConfig } from './BaseGame.js';

type Registry = { tictactoe: typeof TicTacToe; cardgame: typeof CardGame };
const REGISTRY: Registry = { tictactoe: TicTacToe, cardgame: CardGame };

export const GameFactory = {
  create<T extends GameType>(gameType: T, players: RoomPlayer[]): InstanceType<Registry[T]> {
    const Cls = REGISTRY[gameType];
    if (!Cls) throw new Error('UNKNOWN_GAME_TYPE');
    return new Cls({ players }) as InstanceType<Registry[T]>;
  },

  getConfig(gameType: GameType): GameConfig {
    const Cls = REGISTRY[gameType];
    if (!Cls) throw new Error('UNKNOWN_GAME_TYPE');
    return Cls.getConfig();
  },

  isValidGameType(value: unknown): value is GameType {
    return typeof value === 'string' && value in REGISTRY;
  },

  list(): GameType[] {
    return Object.keys(REGISTRY) as GameType[];
  },
};
