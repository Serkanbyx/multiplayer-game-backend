import type http from 'node:http';
import type { Express } from 'express';
import type { Server as SocketServer } from 'socket.io';

export interface TestContext {
  baseUrl: string;
  app: Express;
  httpServer: http.Server;
  io: SocketServer;
  db: any;
  dbClient: any;
  redis: any;
}

let ctx: TestContext | null = null;

export const setTestContext = (context: TestContext): void => {
  ctx = context;
};

export const getTestContext = (): TestContext => {
  if (!ctx) throw new Error('Test context not initialized — setupFile did not run');
  return ctx;
};
