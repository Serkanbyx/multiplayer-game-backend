import type { Server } from 'socket.io';

let io: Server | null = null;

export const setIo = (instance: Server): void => {
  io = instance;
};

export const getIo = (): Server | null => io;
