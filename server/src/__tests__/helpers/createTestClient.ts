import supertest from 'supertest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { getTestContext } from './testContext.js';

interface TestClient {
  agent: ReturnType<typeof supertest>;
  socket: ClientSocket;
  token: string;
  userId: string;
  cleanup: () => void;
}

let userCounter = 0;

const shortId = (): string => {
  const n = ++userCounter;
  const r = Math.random().toString(36).slice(2, 6);
  return `${n}_${r}`;
};

/**
 * Creates a fully authenticated test client with an HTTP agent and a connected socket.
 * Call `cleanup()` when done to disconnect the socket.
 */
export const createTestClient = async (
  opts: { isGuest?: boolean; role?: 'player' | 'admin' } = {},
): Promise<TestClient> => {
  const { baseUrl, app } = getTestContext();
  const agent = supertest(app);

  if (opts.isGuest) {
    const displayName = `Guest_${shortId()}`;
    const res = await agent
      .post('/api/auth/guest')
      .send({ displayName })
      .expect(201);

    const token = res.body.data.token as string;
    const userId = res.body.data.user._id as string;

    const socket = ioClient(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });

    await waitForConnect(socket);

    return {
      agent,
      socket,
      token,
      userId,
      cleanup: () => socket.disconnect(),
    };
  }

  const id = shortId();
  const username = `u${id}`.slice(0, 20);
  const email = `${id}@test.local`;
  const password = 'TestPass123!';
  const displayName = `User_${id}`;

  const res = await agent
    .post('/api/auth/register')
    .send({ username, email, password, displayName })
    .expect(201);

  const token = res.body.data.token as string;
  const userId = res.body.data.user.id as string;

  if (opts.role === 'admin') {
    const { db } = getTestContext();
    const { users } = await import('../../db/schema/index.js');
    const { eq } = await import('drizzle-orm');
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
  }

  const socket = ioClient(baseUrl, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });

  await waitForConnect(socket);

  return {
    agent: supertest(app),
    socket,
    token,
    userId,
    cleanup: () => socket.disconnect(),
  };
};

/* ─── Socket Helpers ──────────────────────────────────────────── */

const waitForConnect = (socket: ClientSocket, timeoutMs = 5000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), timeoutMs);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

export const waitForEvent = <T = unknown>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 5000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event as any, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

export const emitWithCb = <T = unknown>(
  socket: ClientSocket,
  event: string,
  data: unknown,
): Promise<T> =>
  new Promise((resolve) => {
    (socket as any).emit(event, data, (response: T) => resolve(response));
  });

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
