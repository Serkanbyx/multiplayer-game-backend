import type { GameType, GameState } from '../../../shared/types/games.js';

export type GameConfig = {
  gameType: GameType;
  minPlayers: number;
  maxPlayers: number;
};

export type ActionResult = {
  stateChanged: boolean;
  gameOver: boolean;
  result?: 'win' | 'draw';
  winnerId?: string;
};

export abstract class BaseGame<TState extends GameState> {
  static getConfig(): GameConfig {
    throw new Error('Subclass must override getConfig()');
  }

  abstract getStateFor(userId: string | null): TState;
  abstract getPublicState(): TState;
  abstract applyAction(userId: string, action: string, payload: unknown): ActionResult;
  abstract getCurrentPlayerId(): string;
  abstract isGameOver(): boolean;
  abstract getResult(): { result: 'win' | 'draw'; winnerId?: string } | null;
  abstract getMoveLog(): unknown[];
  abstract serialize(): unknown;

  static deserialize(_raw: unknown): BaseGame<GameState> {
    throw new Error('Subclass must override deserialize()');
  }
}
