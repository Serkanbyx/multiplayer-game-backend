import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { getTestContext } from './helpers/testContext.js';
import { createTestClient } from './helpers/createTestClient.js';

describe('Admin Integration', () => {
  it('non-admin cannot access /api/admin/* routes', async () => {
    const { app } = getTestContext();
    const player = await createTestClient();

    try {
      const res = await supertest(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${player.token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    } finally {
      player.cleanup();
    }
  });

  it('admin can access dashboard stats', async () => {
    const { app } = getTestContext();
    const admin = await createTestClient({ role: 'admin' });

    try {
      const res = await supertest(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalMatches');
    } finally {
      admin.cleanup();
    }
  });

  it('admin can list users', async () => {
    const { app } = getTestContext();
    const admin = await createTestClient({ role: 'admin' });
    await createTestClient();

    try {
      const res = await supertest(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination).toBeDefined();
    } finally {
      admin.cleanup();
    }
  });

  it('admin cannot delete themselves (self-protection)', async () => {
    const { app } = getTestContext();
    const admin = await createTestClient({ role: 'admin' });

    try {
      const res = await supertest(app)
        .delete(`/api/admin/users/${admin.userId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(403);

      expect(res.body.message).toContain('Cannot delete your own account');
    } finally {
      admin.cleanup();
    }
  });

  it('cannot demote the only admin (last-admin protection)', async () => {
    const { app } = getTestContext();
    const admin = await createTestClient({ role: 'admin' });
    const player = await createTestClient();

    try {
      const res = await supertest(app)
        .patch(`/api/admin/users/${admin.userId}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'player' })
        .expect(403);

      expect(res.body.message).toContain('Cannot change your own role');
    } finally {
      admin.cleanup();
      player.cleanup();
    }
  });

  it('admin can delete another user', async () => {
    const { app } = getTestContext();
    const admin = await createTestClient({ role: 'admin' });
    const target = await createTestClient();

    try {
      await supertest(app)
        .delete(`/api/admin/users/${target.userId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      const checkRes = await supertest(app)
        .get(`/api/admin/users/${target.userId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(404);

      expect(checkRes.body.success).toBe(false);
    } finally {
      admin.cleanup();
      target.cleanup();
    }
  });

  it('admin can promote a player to admin', async () => {
    const { app } = getTestContext();
    const admin = await createTestClient({ role: 'admin' });
    const player = await createTestClient();

    try {
      const res = await supertest(app)
        .patch(`/api/admin/users/${player.userId}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.data.user.role).toBe('admin');
    } finally {
      admin.cleanup();
      player.cleanup();
    }
  });
});
