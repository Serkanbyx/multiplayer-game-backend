import type { GameType } from "../../../shared/types/games.js";

export interface GameConfig {
  maxPlayers: number;
  minPlayers: number;
  turnTimeoutMs: number;
}

const configs: Record<GameType, GameConfig> = {
  "tic-tac-toe": {
    maxPlayers: 2,
    minPlayers: 2,
    turnTimeoutMs: 30_000,
  },
  "card-game": {
    maxPlayers: 4,
    minPlayers: 2,
    turnTimeoutMs: 60_000,
  },
};

const VALID_GAME_TYPES = new Set<string>(Object.keys(configs));

export const GameFactory = {
  getConfig(gameType: GameType): GameConfig {
    const config = configs[gameType];
    if (!config) throw new Error(`Unknown game type: ${gameType}`);
    return config;
  },

  isValidGameType(value: unknown): value is GameType {
    return typeof value === "string" && VALID_GAME_TYPES.has(value);
  },
};
