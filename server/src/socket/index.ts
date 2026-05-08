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
import { registerGameHandlers } from './gameHandlers.js';
import { registerDisconnectHandlers } from './disconnectHandlers.js';

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

export const registerSocketHandlers = (io: TypedServer): void => {
  io.use(authSocket);

  io.on('connection', (socket: TypedSocket) => {
    const { user } = socket.data;
    console.log(`Socket connected: ${user.displayName} (${user._id})`);

    registerRoomHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDisconnectHandlers(io, socket);
  });
};
