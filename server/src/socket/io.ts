import type { TypedServer } from './index.js';

let io: TypedServer | null = null;

export const setIo = (instance: TypedServer): void => {
  io = instance;
};

/** Returns the typed Socket.io server instance (throws if called before init). */
export const getIo = (): TypedServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
};
