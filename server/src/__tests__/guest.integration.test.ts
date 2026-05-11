import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { getTestContext } from './helpers/testContext.js';
import { createTestClient, emitWithCb } from './helpers/createTestClient.js';

describe('Guest Integration', () => {
  it('loginAsGuest returns a valid token and guest user', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);

    const res = await agent
      .post('/api/auth/guest')
      .send({ displayName: 'TestGuest' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.isGuest).toBe(true);
    expect(res.body.data.user.displayName).toBe('TestGuest');
  });

  it('guest cannot access GET /api/auth/me (registered-only)', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);

    const guestRes = await agent
      .post('/api/auth/guest')
      .send({ displayName: 'Blocked Guest' })
      .expect(201);

    const token = guestRes.body.data.token as string;

    const meRes = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(meRes.body.success).toBe(false);
  });

  it('guest can connect via socket and create a room', async () => {
    const guest = await createTestClient({ isGuest: true });

    try {
      expect(guest.socket.connected).toBe(true);

      const response = await emitWithCb<{ success: boolean; room?: any }>(
        guest.socket,
        'room:create',
        { gameType: 'tictactoe', isPrivate: false },
      );

      expect(response.success).toBe(true);
      expect(response.room).toBeDefined();
      expect(response.room.gameType).toBe('tictactoe');
    } finally {
      guest.cleanup();
    }
  });
});
