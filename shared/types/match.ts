import type { GameType } from './games.js';

export interface MatchPlayerSnapshot {
  userId: string | null;
  displayName: string;
  avatar?: string;
  isGuest: boolean;
  score: number;
  position?: number;
}

export type MatchResult =
  | { outcome: 'win'; winnerId: string }
  | { outcome: 'draw' }
  | { outcome: 'forfeit'; forfeitedBy: string };

export interface MatchMove {
  by: string;
  type: string;
  payload: unknown;
  at: number;
}

export interface MatchRecord {
  id: string;
  roomCode: string;
  gameType: GameType;
  players: MatchPlayerSnapshot[];
  result: MatchResult;
  duration: number;
  totalRounds: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}
