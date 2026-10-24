'use strict';
const request = require('supertest');
const app = require('../app');
const { setup, teardown, clearDB } = require('./testHelpers');

beforeAll(async () => { await setup(); });
afterAll(async () => { await teardown(); });
afterEach(async () => { await clearDB(); });

async function createAdminAndHr() {
  await request(app).post('/api/setup').send({
    companyName: 'Test Corp', adminName: 'Admin', adminEmail: 'admin@test.com', adminPassword: 'password123',
  });
  const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
  const adminToken = adminLogin.body.token;

  const hrRes = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'HR User', email: 'hr@test.com' });
  const tempPassword = hrRes.body.tempPassword;

  // HR must change password first
  const hrLogin = await request(app).post('/api/auth/login').send({ email: 'hr@test.com', password: tempPassword });
  const hrTmpToken = hrLogin.body.token;
  await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${hrTmpToken}`)
    .send({ newPassword: 'HrPassword123!' });
  const hrFinalLogin = await request(app).post('/api/auth/login').send({ email: 'hr@test.com', password: 'HrPassword123!' });

  return { adminToken, hrToken: hrFinalLogin.body.token };
}

describe('RBAC: HR cannot access admin endpoints', () => {
  it('HR GET /api/users -> 403', async () => {
    const { hrToken } = await createAdminAndHr();
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${hrToken}`);
    expect(res.status).toBe(403);
  });

  it('HR PUT /api/settings -> 403', async () => {
    const { hrToken } = await createAdminAndHr();
    const res = await request(app).put('/api/settings').set('Authorization', `Bearer ${hrToken}`)
      .send({ companyName: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('HR GET /api/audit -> 403', async () => {
    const { hrToken } = await createAdminAndHr();
    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${hrToken}`);
    expect(res.status).toBe(403);
  });

  it('HR GET /api/settings -> 200', async () => {
    const { hrToken } = await createAdminAndHr();
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${hrToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Users: cannot create admin role', () => {
  it('POST /api/users creates hr role (not admin)', async () => {
    await request(app).post('/api/setup').send({
      companyName: 'Test Corp', adminName: 'Admin', adminEmail: 'admin@test.com', adminPassword: 'password123',
    });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'password123' });
    const adminToken = adminLogin.body.token;

    const res = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New User', email: 'new@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('hr');
    expect(res.body.tempPassword).toBeDefined();
  });
});
