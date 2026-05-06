import type { GameType } from "./games.js";

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
}

export interface MatchPlayerSnapshot {
  userId: string;
  displayName: string;
  avatar?: string;
  isGuest: boolean;
  score: number;
}

export type MatchResult =
  | { outcome: "win"; winnerId: string }
  | { outcome: "draw" }
  | { outcome: "forfeit"; forfeitedBy: string };
