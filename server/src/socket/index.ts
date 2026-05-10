import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@mpg/shared/types/events.js';
import { authSocket } from './authSocket.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { registerMatchmakingHandlers } from './matchmakingHandlers.js';
import { registerChatHandlers } from './chatHandlers.js';
import { registerGameHandlers, loadGame } from './gameHandlers.js';
import { registerDisconnectHandlers, cancelGraceTimer } from './disconnectHandlers.js';
import * as roomService from '../services/roomService.js';

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

const socketRoomChannel = (roomCode: string) => `room:${roomCode}`;

/**
 * Checks whether the user was previously in a room and auto-rejoins
 * them if the room still exists in Redis. Cancels any pending grace
 * timer and marks the player as connected again.
 */
const handleReconnection = async (io: TypedServer, socket: TypedSocket): Promise<void> => {
  const { user } = socket.data;
  const roomCode = await roomService.getUserRoom(user._id);
  if (!roomCode) return;

  const room = await roomService.getRoom(roomCode);
  if (!room) return;

  const isPlayer = room.players.some((p) => p.userId === user._id);
  const isSpectator = room.spectators.some((s) => s.userId === user._id);

  if (!isPlayer && !isSpectator) return;

  socket.join(socketRoomChannel(roomCode));

  if (isPlayer) {
    cancelGraceTimer(roomCode, user._id);

    const updatedRoom = await roomService.updateRoom(roomCode, (current) => ({
      ...current,
      players: current.players.map((p) =>
        p.userId === user._id ? { ...p, isConnected: true } : p,
      ),
    }));

    io.in(socketRoomChannel(roomCode)).emit('room:updated', updatedRoom);

    if (updatedRoom.status === 'playing') {
      const loaded = await loadGame(roomCode);
      if (loaded) {
        socket.emit('game:state-updated', {
          roomCode,
          gameState: loaded.game.getStateFor(user._id),
        });
        socket.emit('game:turn', {
          roomCode,
          currentPlayerId: loaded.game.getCurrentPlayerId(),
        });
      }
    }

    console.log(`Reconnected player ${user.displayName} (${user._id}) to room ${roomCode}`);
  } else {
    socket.emit('room:updated', room);

    if (room.status === 'playing') {
      const loaded = await loadGame(roomCode);
      if (loaded) {
        socket.emit('game:state-updated', {
          roomCode,
          gameState: loaded.game.getStateFor(null),
        });
      }
    }

    console.log(`Reconnected spectator ${user.displayName} (${user._id}) to room ${roomCode}`);
  }
};

export const registerSocketHandlers = (io: TypedServer): void => {
  io.use(authSocket);

  io.on('connection', async (socket: TypedSocket) => {
    const { user } = socket.data;
    console.log(`Socket connected: ${user.displayName} (${user._id})`);

    registerRoomHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDisconnectHandlers(io, socket);

    try {
      await handleReconnection(io, socket);
    } catch (err) {
      console.error('Error during reconnection check:', err);
    }
  });
};
