'use strict';
const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');

beforeAll(async () => { await setup(); });
afterAll(async () => { await teardown(); });
afterEach(async () => { await clearDB(); });

async function createAndLoginAdmin() {
  await request(app).post('/api/setup').send({
    companyName: 'Test Corp', adminName: 'Admin', adminEmail: 'admin@test.com', adminPassword: 'password123',
  });
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
  return res.body.token;
}

describe('POST /api/auth/login', () => {
  it('returns JWT on valid credentials', async () => {
    const token = await createAndLoginAdmin();
    expect(token).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    await request(app).post('/api/setup').send({
      companyName: 'X', adminName: 'A', adminEmail: 'a@test.com', adminPassword: 'password123',
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for deactivated user', async () => {
    const adminToken = await createAndLoginAdmin();
    // Create HR user
    const hrRes = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'HR User', email: 'hr@test.com' });
    const hrId = hrRes.body.user._id;
    const tempPassword = hrRes.body.tempPassword;
    // Deactivate
    await request(app).patch(`/api/users/${hrId}/deactivate`).set('Authorization', `Bearer ${adminToken}`);
    // Try login
    const res = await request(app).post('/api/auth/login').send({ email: 'hr@test.com', password: tempPassword });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user for valid token', async () => {
    const token = await createAndLoginAdmin();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('mustChangePassword guard', () => {
  it('blocks HR from accessing settings when mustChangePassword=true', async () => {
    const adminToken = await createAndLoginAdmin();
    const hrRes = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'HR User', email: 'hr@test.com' });
    const tempPassword = hrRes.body.tempPassword;

    const loginRes = await request(app).post('/api/auth/login').send({ email: 'hr@test.com', password: tempPassword });
    const hrToken = loginRes.body.token;
    expect(loginRes.body.user.mustChangePassword).toBe(true);

    // Try accessing settings — should be blocked
    const settingsRes = await request(app).get('/api/settings').set('Authorization', `Bearer ${hrToken}`);
    expect(settingsRes.status).toBe(403);
  });

  it('allows change-password when mustChangePassword=true', async () => {
    const adminToken = await createAndLoginAdmin();
    const hrRes = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'HR User', email: 'hr@test.com' });
    const tempPassword = hrRes.body.tempPassword;
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'hr@test.com', password: tempPassword });
    const hrToken = loginRes.body.token;

    const changeRes = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ newPassword: 'NewPassword123!' });
    expect(changeRes.status).toBe(200);
  });
});
