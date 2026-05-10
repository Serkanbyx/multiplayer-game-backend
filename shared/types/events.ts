import type { Room, RoomPlayer } from "./room.js";
import type { GameState, GameAction, GameType } from "./games.js";
import type { AuthUser } from "./auth.js";

/** Client → Server socket events */
export interface ClientToServerEvents {
  "room:create": (
    data: { gameType: GameType; isPrivate: boolean },
    callback: (response: { success: boolean; room?: Room; error?: string }) => void,
  ) => void;
  "room:join": (
    data: { roomCode: string; asSpectator?: boolean },
    callback: (response: { success: boolean; room?: Room; error?: string }) => void,
  ) => void;
  "room:leave": () => void;
  "room:ready": () => void;
  "room:start": () => void;
  "room:spectate": (
    data: { roomCode: string },
    callback: (response: { success: boolean; room?: Room; error?: string }) => void,
  ) => void;

  "game:action": (action: GameAction) => void;
  "game:rematch-request": () => void;
  "game:rematch-accept": () => void;
  "game:rematch-decline": () => void;

  "chat:message": (data: { message: string }) => void;

  "matchmaking:join": (data: { gameType: GameType }) => void;
  "matchmaking:leave": () => void;
}

/** Server → Client socket events */
export interface ServerToClientEvents {
  "room:updated": (room: Room) => void;
  "room:player-joined": (player: RoomPlayer) => void;
  "room:player-left": (data: { playerId: string; newHostId?: string }) => void;
  "room:kicked": (data: { reason: string }) => void;
  "room:closed": () => void;

  "game:started": (data: { roomCode: string; gameState: GameState }) => void;
  "game:state-updated": (data: { roomCode: string; gameState: GameState }) => void;
  "game:turn": (data: { roomCode: string; currentPlayerId: string }) => void;
  "game:ended": (data: {
    roomCode: string;
    result: 'win' | 'draw' | 'aborted';
    winnerId: string | null;
    winnerDisplayName: string | null;
    matchId: string | null;
    reason: string;
  }) => void;
  "game:rematch-requested": (data: { userId: string; votes: string[] }) => void;
  "game:rematch-accepted": (data: { userId: string; votes: string[] }) => void;
  "game:rematch-declined": (data: { userId: string }) => void;
  "game:timer-update": (data: { playerId: string; remainingMs: number }) => void;

  "chat:message": (data: { senderId: string; senderName: string; message: string; timestamp: string }) => void;
  "chat:system": (data: { message: string; timestamp: string }) => void;

  "matchmaking:searching": (data: { gameType: GameType; estimatedWait: number }) => void;
  "matchmaking:found": (data: { roomCode: string }) => void;
  "matchmaking:cancelled": () => void;

  "user:online-status": (data: { userId: string; isOnline: boolean }) => void;

  "error": (data: { message: string; code?: string }) => void;
}

/** Attached to each socket after auth handshake */
export interface SocketData {
  user: AuthUser;
}
