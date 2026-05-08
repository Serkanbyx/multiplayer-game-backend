import type { GameType, GameState } from "./games.js";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface RoomPlayer {
  userId: string;
  displayName: string;
  isGuest: boolean;
  avatarUrl: string | null;
  position: number;
  isConnected: boolean;
}

export interface RoomSpectator {
  userId: string;
  displayName: string;
}

export interface ChatMessage {
  userId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

export interface Room {
  roomCode: string;
  gameType: GameType;
  isPrivate: boolean;
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  players: RoomPlayer[];
  spectators: RoomSpectator[];
  gameState: GameState | null;
  chat: ChatMessage[];
  rematchVotes: string[];
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}
