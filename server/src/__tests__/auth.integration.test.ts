import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { getTestContext } from './helpers/testContext.js';

let counter = 0;
const shortId = () => `${++counter}_${Math.random().toString(36).slice(2, 6)}`;

const registerUser = () => {
  const id = shortId();
  return {
    username: `a${id}`.slice(0, 20),
    email: `a${id}@test.local`,
    password: 'SecurePass123!',
    displayName: `AuthUser_${id}`,
  };
};

describe('Auth Integration — full REST lifecycle', () => {
  it('register → login → getMe → updateProfile → changePassword → deleteAccount', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);
    const creds = registerUser();

    /* ── Register ──────────────────────────────────────────────── */
    const regRes = await agent.post('/api/auth/register').send(creds).expect(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.token).toBeDefined();
    expect(regRes.body.data.user.username).toBe(creds.username);
    const token = regRes.body.data.token as string;

    /* ── Login ─────────────────────────────────────────────────── */
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password })
      .expect(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();

    /* ── Get Me ────────────────────────────────────────────────── */
    const meRes = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meRes.body.data.user.username).toBe(creds.username);
    expect(meRes.body.data.user.email).toBe(creds.email);

    /* ── Update Profile ────────────────────────────────────────── */
    const newDisplayName = 'Updated Name';
    const profileRes = await agent
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: newDisplayName, bio: 'Test bio' })
      .expect(200);
    expect(profileRes.body.data.user.displayName).toBe(newDisplayName);

    /* ── Change Password ───────────────────────────────────────── */
    const newPassword = 'NewSecurePass456!';
    await agent
      .put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: creds.password, newPassword })
      .expect(200);

    const reLoginRes = await agent
      .post('/api/auth/login')
      .send({ email: creds.email, password: newPassword })
      .expect(200);
    expect(reLoginRes.body.success).toBe(true);

    /* ── Delete Account ────────────────────────────────────────── */
    await agent
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: newPassword })
      .expect(200);

    await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('rejects duplicate username registration', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);
    const creds = registerUser();

    await agent.post('/api/auth/register').send(creds).expect(201);

    const dupRes = await agent
      .post('/api/auth/register')
      .send({ ...creds, email: `other_${shortId()}@test.local` })
      .expect(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('rejects duplicate email registration', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);
    const creds = registerUser();

    await agent.post('/api/auth/register').send(creds).expect(201);

    const dupRes = await agent
      .post('/api/auth/register')
      .send({ ...creds, username: `o${shortId()}`.slice(0, 20) })
      .expect(409);
    expect(dupRes.body.success).toBe(false);
  });

  it('rejects login with wrong password', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);
    const creds = registerUser();

    await agent.post('/api/auth/register').send(creds).expect(201);

    const res = await agent
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'WrongPass999!' })
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects role escalation via PUT /api/auth/me', async () => {
    const { app } = getTestContext();
    const agent = supertest(app);
    const creds = registerUser();

    const regRes = await agent.post('/api/auth/register').send(creds).expect(201);
    const token = regRes.body.data.token as string;

    await agent
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' })
      .expect(200);

    const meRes = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meRes.body.data.user.role).toBe('player');
  });
});
