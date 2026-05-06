import type { GameType } from "./games.js";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface Room {
  code: string;
  hostId: string;
  gameType: GameType;
  status: RoomStatus;
  players: RoomPlayer[];
  spectators: RoomSpectator[];
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: string;
}

export interface RoomPlayer {
  id: string;
  displayName: string;
  avatar?: string;
  isGuest: boolean;
  isReady: boolean;
  isConnected: boolean;
}

export interface RoomSpectator {
  id: string;
  displayName: string;
}
