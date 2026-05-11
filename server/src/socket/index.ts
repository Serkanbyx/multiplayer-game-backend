import type { Server, Socket } from 'socket.io';
import type { Logger } from 'pino';
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
import { childLogger } from '../utils/logger.js';

interface ServerSocketData extends SocketData {
  logger: Logger;
}

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  ServerSocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  ServerSocketData
>;

const socketRoomChannel = (roomCode: string) => `room:${roomCode}`;

/**
 * Checks whether the user was previously in a room and auto-rejoins
 * them if the room still exists in Redis. Cancels any pending grace
 * timer and marks the player as connected again.
 */
const handleReconnection = async (io: TypedServer, socket: TypedSocket): Promise<void> => {
  const { user } = socket.data;
  const log = socket.data.logger;
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

    log.info({ roomCode, role: 'player' }, 'Reconnected to room');
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

    log.info({ roomCode, role: 'spectator' }, 'Reconnected to room');
  }
};

export const registerSocketHandlers = (io: TypedServer): void => {
  io.use(authSocket);

  io.on('connection', async (socket: TypedSocket) => {
    const { user } = socket.data;
    socket.data.logger = childLogger({ socketId: socket.id, userId: user._id });
    socket.data.logger.info({ displayName: user.displayName }, 'Socket connected');

    registerRoomHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDisconnectHandlers(io, socket);

    try {
      await handleReconnection(io, socket);
    } catch (err) {
      socket.data.logger.error({ err }, 'Error during reconnection check');
    }
  });
};
