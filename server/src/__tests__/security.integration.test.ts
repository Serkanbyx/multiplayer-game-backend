import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { getTestContext } from './helpers/testContext.js';
import { createTestClient } from './helpers/createTestClient.js';

let secCounter = 0;
const secId = () => `${++secCounter}_${Math.random().toString(36).slice(2, 6)}`;

describe('Security Integration', () => {
  it('SQL-injection-style payload is treated as plain string by parameterized queries', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);

    const sqlPayload = "'; DROP TABLE users;--";

    const res = await agent.post('/api/auth/register').send({
      username: sqlPayload,
      email: `sqli_${secId()}@test.local`,
      password: 'SecurePass123!',
      displayName: 'SQLi Test',
    });

    // Should either succeed (treating injection as plain text) or fail validation
    // but NOT cause a DB error or table drop
    expect([201, 400, 422]).toContain(res.status);

    // Verify users table still exists
    const { db } = getTestContext();
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`SELECT count(*) FROM users`);
    expect(result).toBeDefined();
  });

  it('XSS payload in displayName is stored escaped or as-is (not executed)', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);

    const xssPayload = '<script>alert("xss")</script>';
    const id = secId();

    const res = await agent.post('/api/auth/register').send({
      username: `xss${id}`.slice(0, 20),
      email: `xss_${id}@test.local`,
      password: 'SecurePass123!',
      displayName: xssPayload,
    });

    if (res.status === 201) {
      const token = res.body.data.token;
      const meRes = await agent
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // The name should be stored, not cause an error
      expect(meRes.body.data.user.displayName).toBeDefined();
    }
  });

  it('oversized body (>10KB) is rejected', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);

    const largeBody = { data: 'x'.repeat(20_000) };

    const res = await agent
      .post('/api/auth/register')
      .send(largeBody);

    expect([400, 413]).toContain(res.status);
  });

  it('prototype-pollution attempt is stripped by sanitizeMiddleware', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);

    const res = await agent
      .post('/api/auth/register')
      .send({
        username: `proto${secId()}`.slice(0, 20),
        email: `proto_${secId()}@test.local`,
        password: 'SecurePass123!',
        displayName: 'Proto Test',
        __proto__: { polluted: true },
        constructor: { prototype: { polluted: true } },
      });

    expect((Object.prototype as any).polluted).toBeUndefined();
    expect([201, 400, 422]).toContain(res.status);
  });

  it('does NOT expose x-powered-by header', async () => {
    const { app } = getTestContext();
    const res = await supertest(app).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('includes security headers from helmet', async () => {
    const { app } = getTestContext();
    const res = await supertest(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('role escalation via PUT /api/auth/me body is silently ignored', async () => {
    const { app } = getTestContext();
    const player = await createTestClient();

    try {
      await supertest(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${player.token}`)
        .send({ role: 'admin', displayName: 'Hacker' })
        .expect(200);

      const meRes = await supertest(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${player.token}`)
        .expect(200);

      expect(meRes.body.data.user.role).toBe('player');
    } finally {
      player.cleanup();
    }
  });

  it('unauthenticated requests to protected routes return 401', async () => {
    const { app } = getTestContext();

    await supertest(app).get('/api/auth/me').expect(401);
    await supertest(app).get('/api/admin/stats').expect(401);
  });

  it('invalid JWT token returns 401', async () => {
    const { app } = getTestContext();

    await supertest(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);
  });
});
