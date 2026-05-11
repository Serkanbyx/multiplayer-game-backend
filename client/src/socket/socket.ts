import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@mpg/shared/types/events';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export const connectSocket = (token: string): AppSocket => {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
};

export const getSocket = (): AppSocket | null => socket;
export const disconnectSocket = (): void => { socket?.disconnect(); socket = null; };
